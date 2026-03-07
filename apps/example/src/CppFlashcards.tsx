import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { marked } from 'marked'
import { HeaderRight } from './HeaderRight'
import { FLASHCARDS, CHAPTERS, CHAPTER_NAMES, type Flashcard } from './cpp-flashcards-data'
import { callClaude } from './claude-utils'
import { useAuth } from './AuthContext'
import { loadFromCloud, saveToCloud, saveOverrideToCloud, type CppCloudData, type EditSource } from './cpp-flashcards-db'

// ── SRS constants ──────────────────────────────────────────────
const A_MS          = 60 * 1000
const MAX_BUCKET    = 14
const STORAGE_KEY   = 'cpp-fc-progress'
const OVERRIDES_KEY = 'cpp-fc-overrides'
const CUSTOM_KEY    = 'cpp-fc-custom'
const IMPORTANCE_KEY  = 'cpp-fc-importance'
const GRAVEYARD_KEY   = 'cpp-fc-graveyard'

// importance: -2=very low, -1=low, 0=medium, 1=high, 2=very high
export type Importance = -2 | -1 | 0 | 1 | 2
type ImportanceMap = Record<number, Importance>

export const IMPORTANCE_NAMES: Record<Importance, string> = {
  '-2': 'Very Low',
  '-1': 'Low',
   '0': 'Medium',
   '1': 'High',
   '2': 'Very High',
}

// Higher importance → shorter interval (see more often)
const IMPORTANCE_FACTOR: Record<number, number> = { '-2': 2, '-1': 1.5, 0: 1, 1: 0.67, 2: 0.5 }

function bucketIntervalMs(bucket: number, importance: Importance = 0): number {
  return A_MS * Math.pow(2, bucket) * (IMPORTANCE_FACTOR[importance] ?? 1)
}

function formatInterval(ms: number): string {
  const s = ms / 1000
  if (s < 60)  return `${Math.round(s)}s`
  const m = s / 60
  if (m < 60)  return `${Math.round(m)}m`
  const h = m / 60
  if (h < 24)  return `${Math.round(h)}h`
  const d = h / 24
  if (d < 30)  return `${Math.round(d)}d`
  return `${Math.round(d / 7)}w`
}

function formatRelative(ts: number): string {
  return formatInterval(Math.max(0, ts - Date.now()))
}

// ── Progress store ─────────────────────────────────────────────
interface CardState { bucket: number; nextReview: number }
type ProgressMap = Record<number, CardState>

function loadProgress(): ProgressMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  catch { return {} }
}
function saveProgress(p: ProgressMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

// ── Override / custom card storage ─────────────────────────────
type OverridesMap = Record<number, { q: string; a: string }>

function loadOverrides(): OverridesMap {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}') }
  catch { return {} }
}
function saveOverrides(o: OverridesMap) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o))
}

function loadCustomCards(): Flashcard[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]') }
  catch { return [] }
}
function saveCustomCards(cards: Flashcard[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(cards))
}

function loadImportance(): ImportanceMap {
  try { return JSON.parse(localStorage.getItem(IMPORTANCE_KEY) ?? '{}') }
  catch { return {} }
}
function saveImportance(m: ImportanceMap) {
  localStorage.setItem(IMPORTANCE_KEY, JSON.stringify(m))
}

function loadGraveyard(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(GRAVEYARD_KEY) ?? '[]')) }
  catch { return new Set() }
}
function saveGraveyard(g: Set<number>) {
  localStorage.setItem(GRAVEYARD_KEY, JSON.stringify([...g]))
}

// ── Queue logic ────────────────────────────────────────────────
function applyOverrides(cards: Flashcard[], overrides: OverridesMap): Flashcard[] {
  return cards.map(c => {
    const o = overrides[c.id]
    return o ? { ...c, q: o.q, a: o.a } : c
  })
}

function getCards(
  chapter: string,
  overrides: OverridesMap,
  customs: Flashcard[],
  importanceFilter: Importance | 'all',
  importanceMap: ImportanceMap,
  graveyard: Set<number>,
): Flashcard[] {
  const base = chapter === 'all' ? FLASHCARDS : FLASHCARDS.filter(c => c.chapter === chapter)
  const withOverrides = applyOverrides(base, overrides)
  const filtered = chapter === 'all' ? customs : customs.filter(c => c.chapter === chapter)
  const all = [...withOverrides, ...filtered].filter(c => !graveyard.has(c.id))
  if (importanceFilter === 'all') return all
  return all.filter(c => (importanceMap[c.id] ?? 0) === importanceFilter)
}

function computeQueue(cards: Flashcard[], progress: ProgressMap): Flashcard[] {
  const now = Date.now()
  const due: Flashcard[]    = []
  const unseen: Flashcard[] = []

  for (const c of cards) {
    const s = progress[c.id]
    if (!s) {
      unseen.push(c)
    } else {
      // nextReview already has importance baked in (set during rate())
      if (s.nextReview <= now) due.push(c)
    }
  }

  due.sort((a, b) => (progress[a.id]?.nextReview ?? 0) - (progress[b.id]?.nextReview ?? 0))
  for (let i = unseen.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[unseen[i], unseen[j]] = [unseen[j], unseen[i]]
  }
  return [...due, ...unseen]
}

function nextDueTs(progress: ProgressMap, cards: Flashcard[]): number | null {
  const now = Date.now()
  let earliest: number | null = null
  for (const c of cards) {
    const s = progress[c.id]
    if (!s) continue
    if (s.nextReview <= now) continue
    if (earliest === null || s.nextReview < earliest) earliest = s.nextReview
  }
  return earliest
}

// ── AI helpers ─────────────────────────────────────────────────
function parseJsonFromText(text: string): Record<string, string> {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found')
  return JSON.parse(match[0])
}

function buildEnhancePrompt(q: string, a: string, note: string, context: string): string {
  return `You are improving a C++ study flashcard.

CURRENT CARD:
Q: ${q}
A: ${a}

INSTRUCTION: ${note || 'Improve clarity, accuracy, and conciseness.'}

NOTES CONTEXT:
${context}

Return ONLY a JSON object — no markdown fences, no explanation:
{"question": "...", "answer": "..."}

Answer formatting rules:
- For lists, format each bullet as: • **Keyword**: explanation.
- Keep answers concise and factual.
- Use backtick formatting for code, flags, and types.
- Use \\n for line breaks within the answer string.`
}

function buildGeneratePrompt(q: string, note: string, context: string): string {
  return `You are creating an answer for a C++ study flashcard.

QUESTION: ${q}

INSTRUCTION: ${note || 'Generate a clear, accurate, concise answer.'}

NOTES CONTEXT:
${context}

Return ONLY a JSON object — no markdown fences, no explanation:
{"answer": "..."}

Answer formatting rules:
- For lists, format each bullet as: • **Keyword**: explanation.
- Keep the answer concise and factual.
- Use backtick formatting for code, flags, and types.
- Use \\n for line breaks within the answer string.`
}

// ── Markdown renderer ──────────────────────────────────────────
// Converts • bullets → proper markdown list items so marked can render them,
// then runs the full block parser (supports lists, indented lists, code, etc.)
function preprocessMd(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const m = line.match(/^(\s*)•\s+(.*)/)
      return m ? `${m[1]}- ${m[2]}` : line
    })
    .join('\n')
}

function CardText({ text, className }: { text: string; className: string }) {
  const html = marked(preprocessMd(text)) as string
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

// ── Notes section extraction ───────────────────────────────────
function extractSection(md: string, heading: string): string {
  const lines = md.split('\n')
  let startIdx = -1
  let headingLevel = 0

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)/)
    if (m && lines[i].toLowerCase().includes(heading.toLowerCase())) {
      startIdx = i
      headingLevel = m[1].length
      break
    }
  }

  if (startIdx === -1) return `*Section "${heading}" not found in notes.*`

  const result = [lines[startIdx]]
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s/)
    if (m && m[1].length <= headingLevel) break
    result.push(lines[i])
  }
  return result.join('\n')
}

async function fetchNotesContext(chapter: string, noteSection?: string): Promise<string> {
  try {
    const md = await fetch(`/notes/cpp-chapter-${chapter}.md`).then(r => r.text())
    return noteSection ? extractSection(md, noteSection) : md
  } catch {
    return ''
  }
}

// ── Edit sheet ─────────────────────────────────────────────────
interface EditSheetProps {
  mode: 'edit' | 'new'
  card?: Flashcard
  chapter: string
  onSave: (q: string, a: string, source?: EditSource) => void
  onClose: () => void
}

function EditSheet({ mode, card, chapter, onSave, onClose }: EditSheetProps) {
  const [q, setQ]             = useState(card?.q ?? '')
  const [a, setA]             = useState(card?.a ?? '')
  const [aiNote, setAiNote]   = useState('')
  const [loading, setLoading] = useState(false)
  const [aiUsed, setAiUsed]   = useState(false)
  const [error, setError]     = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  function handleSave() {
    if (!q.trim() || !a.trim()) return
    onSave(q.trim(), a.trim(), aiUsed ? 'ai-enhance' : 'manual')
    handleClose()
  }

  async function handleAI() {
    if (!q.trim()) return
    setLoading(true)
    setError('')
    try {
      const context = await fetchNotesContext(chapter, card?.noteSection)
      const prompt  = mode === 'edit'
        ? buildEnhancePrompt(q, a, aiNote, context)
        : buildGeneratePrompt(q, aiNote, context)
      const text   = await callClaude(prompt, 'cpp-quiz')
      const json   = parseJsonFromText(text)
      if (mode === 'edit' && json.question) setQ(json.question)
      if (json.answer) { setA(json.answer); setAiUsed(true) }
    } catch {
      setError('AI request failed — check that ANTHROPIC_API_KEY is set in Vercel.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`fq-sheet-overlay${visible ? ' fq-sheet-overlay-visible' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`fq-sheet fq-edit-sheet${visible ? ' fq-sheet-visible' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="fq-sheet-handle" />
        <div className="fq-sheet-header">
          <span className="fq-sheet-section">{mode === 'edit' ? 'Edit card' : 'New card'}</span>
          <button className="fq-sheet-close" onClick={handleClose}>✕</button>
        </div>

        <div className="fq-sheet-body fq-edit-body">
          <label className="fq-edit-label">Question</label>
          <textarea
            className="fq-edit-textarea"
            value={q}
            onChange={e => setQ(e.target.value)}
            rows={3}
            placeholder="What does…"
          />

          <label className="fq-edit-label">Answer</label>
          <textarea
            className="fq-edit-textarea fq-edit-answer"
            value={a}
            onChange={e => setA(e.target.value)}
            rows={7}
            placeholder="• **Keyword**: explanation."
          />

          <label className="fq-edit-label">
            Note to AI
            <span className="fq-edit-label-hint"> — optional instruction</span>
          </label>
          <input
            className="fq-edit-input"
            type="text"
            value={aiNote}
            onChange={e => setAiNote(e.target.value)}
            placeholder='e.g. "expand on what portability means here"'
          />

          {error && <p className="fq-edit-error">{error}</p>}

          <button
            className="btn btn-primary fq-edit-ai-btn"
            onClick={handleAI}
            disabled={loading || !q.trim()}
          >
            {loading ? 'Thinking…' : mode === 'edit' ? '✦ Enhance with AI' : '✦ Generate answer'}
          </button>

          <div className="fq-edit-actions">
            <button className="btn fq-edit-discard" onClick={handleClose}>
              Discard
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!q.trim() || !a.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Notes bottom sheet ─────────────────────────────────────────
function NotesSheet({ card, onClose }: { card: Flashcard; onClose: () => void }) {
  const [html, setHtml]       = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  useEffect(() => {
    setLoading(true)
    fetchNotesContext(card.chapter, card.noteSection)
      .then(section => setHtml(marked(section) as string))
      .catch(() => setHtml('<p><em>Could not load notes.</em></p>'))
      .finally(() => setLoading(false))
  }, [card.chapter, card.noteSection])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  return (
    <div
      className={`fq-sheet-overlay${visible ? ' fq-sheet-overlay-visible' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`fq-sheet${visible ? ' fq-sheet-visible' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="fq-sheet-handle" />
        <div className="fq-sheet-header">
          <span className="fq-sheet-section">{card.noteSection || 'Notes'}</span>
          <button className="fq-sheet-close" onClick={handleClose}>✕</button>
        </div>
        <div className="fq-sheet-body">
          {loading
            ? <p className="fq-sheet-loading">Loading…</p>
            : <div className="fq-notes-md" dangerouslySetInnerHTML={{ __html: html }} />
          }
        </div>
      </div>
    </div>
  )
}

// ── Add card panel (inline split) ─────────────────────────────
function AddCardPanel({ chapter, onSave, onClose }: {
  chapter: string
  onSave: (q: string, a: string) => void
  onClose: () => void
}) {
  const [q, setQ]           = useState('')
  const [a, setA]           = useState('')
  const [aiNote, setAiNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  async function handleGenerate() {
    if (!q.trim()) return
    setLoading(true)
    setError('')
    try {
      const context = await fetchNotesContext(chapter)
      const text    = await callClaude(buildGeneratePrompt(q, aiNote, context), 'cpp-quiz')
      const json    = parseJsonFromText(text)
      if (json.answer) setA(json.answer)
    } catch {
      setError('AI failed — check ANTHROPIC_API_KEY.')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!q.trim() || !a.trim()) return
    onSave(q.trim(), a.trim())
    onClose()
  }

  return (
    <div className="fq-add-panel">
      <div className="fq-add-header">
        <span className="fq-add-title">New card</span>
        <button className="fq-add-close" onClick={onClose}>✕</button>
      </div>
      <div className="fq-add-body">
        <textarea
          className="fq-edit-textarea"
          value={q}
          onChange={e => setQ(e.target.value)}
          rows={3}
          placeholder="Question…"
        />
        <textarea
          className="fq-edit-textarea"
          value={a}
          onChange={e => setA(e.target.value)}
          rows={5}
          placeholder="Answer… (or generate below)"
        />
        <input
          className="fq-edit-input"
          value={aiNote}
          onChange={e => setAiNote(e.target.value)}
          placeholder="Note to AI (optional)"
        />
        {error && <p className="fq-edit-error">{error}</p>}
        <button
          className="btn btn-primary fq-edit-ai-btn"
          onClick={handleGenerate}
          disabled={loading || !q.trim()}
        >
          {loading ? 'Thinking…' : '✦ Generate answer'}
        </button>
        <div className="fq-edit-actions">
          <button className="btn fq-edit-discard" onClick={onClose}>Discard</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!q.trim() || !a.trim()}
          >Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Bucket bar ─────────────────────────────────────────────────
function BucketBar({ bucket, nextReview }: { bucket: number; nextReview?: number }) {
  const pct    = Math.min(bucket / MAX_BUCKET, 1)
  const nextMs = bucketIntervalMs(bucket)
  const now    = Date.now()
  const dueLabel = nextReview == null
    ? 'new'
    : nextReview <= now
      ? `overdue by ${formatInterval(now - nextReview)}`
      : `due in ${formatInterval(nextReview - now)}`
  return (
    <div className="fq-bucket-row" title={`Bucket ${bucket} · interval ${formatInterval(nextMs)}`}>
      <div className="fq-bucket-bar">
        <div className="fq-bucket-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="fq-bucket-label">{bucket}/{MAX_BUCKET} · {formatInterval(nextMs)}</span>
      <span className="fq-bucket-due">{dueLabel}</span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function CppFlashcards() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [chapter, setChapter]             = useState('all')
  const [progress, setProgress]           = useState<ProgressMap>(loadProgress)
  const [overrides, setOverrides]         = useState<OverridesMap>(loadOverrides)
  const [customs, setCustoms]             = useState<Flashcard[]>(loadCustomCards)
  const [importanceMap, setImportanceMap] = useState<ImportanceMap>(loadImportance)
  const [importanceFilter, setImpFilter]  = useState<Importance | 'all'>('all')
  const [graveyard, setGraveyard]         = useState<Set<number>>(loadGraveyard)
  const [revealed, setRevealed]           = useState(false)
  const [graduated, setGraduated]         = useState(0)
  const [notesOpen, setNotesOpen]         = useState(false)
  const [editOpen, setEditOpen]           = useState(false)
  const [addOpen, setAddOpen]             = useState(false)
  // Tracks which card is being studied — prevents queue reshuffles from swapping the card mid-session
  const [currentCardId, setCurrentCardId] = useState<number | null>(null)
  const cloudSynced = useRef(false)

  // ── Cloud sync ────────────────────────────────────────────────
  // On login: load from Supabase (wins over localStorage).
  // If Supabase has no data yet, migrate current localStorage data up (one-time).
  useEffect(() => {
    if (!user || cloudSynced.current) return
    cloudSynced.current = true
    loadFromCloud(user.id).then(remote => {
      if (remote) {
        // Supabase has data — apply it
        setOverrides(remote.overrides)
        saveOverrides(remote.overrides)
        setCustoms(remote.custom)
        saveCustomCards(remote.custom)
        setProgress(remote.progress)
        saveProgress(remote.progress)
        const impMap = remote.importance as ImportanceMap
        setImportanceMap(impMap)
        saveImportance(impMap)
        const gy = new Set(remote.graveyard)
        setGraveyard(gy)
        saveGraveyard(gy)
      } else {
        // No cloud data — migrate localStorage up
        const local: CppCloudData = {
          overrides:  loadOverrides(),
          custom:     loadCustomCards(),
          progress:   loadProgress(),
          importance: loadImportance(),
          graveyard:  [...loadGraveyard()],
        }
        saveToCloud(user.id, local)
      }
    })
  }, [user])

  // Helper: build current state snapshot for cloud saves
  function cloudState(patches: Partial<CppCloudData> = {}): CppCloudData {
    return {
      overrides:  patches.overrides  ?? overrides,
      custom:     patches.custom     ?? customs,
      progress:   patches.progress   ?? progress,
      importance: patches.importance ?? importanceMap,
      graveyard:  patches.graveyard  ?? [...graveyard],
    }
  }

  // Cards for queue ordering — no overrides, so edits don't reshuffle the queue
  const cards  = useMemo(
    () => getCards(chapter, {}, customs, importanceFilter, importanceMap, graveyard),
    [chapter, customs, importanceFilter, importanceMap, graveyard]
  )
  const queue  = useMemo(() => computeQueue(cards, progress), [cards, progress])

  // Advance to next card only when currentCardId is null or no longer in the queue
  const activeId = (currentCardId != null && queue.some(c => c.id === currentCardId))
    ? currentCardId
    : queue[0]?.id ?? null
  // Sync state if it drifted (e.g. first render, or active card was archived)
  useEffect(() => { setCurrentCardId(activeId) }, [activeId])

  // Apply overrides at display time only
  const cardRaw = queue.find(c => c.id === activeId) ?? null
  const card = cardRaw && overrides[cardRaw.id]
    ? { ...cardRaw, ...overrides[cardRaw.id] }
    : cardRaw
  const bucket = card ? (progress[card.id]?.bucket ?? 0) : 0
  const cardImportance = card ? ((importanceMap[card.id] ?? 0) as Importance) : 0

  function changeChapter(ch: string) {
    setChapter(ch)
    setRevealed(false)
    setGraduated(0)
    setNotesOpen(false)
    setEditOpen(false)
  }

  function rate(delta: number) {
    if (!card) return
    const newBucket = Math.max(0, Math.min(MAX_BUCKET, bucket + delta))
    const newProgress: ProgressMap = {
      ...progress,
      [card.id]: { bucket: newBucket, nextReview: Date.now() + bucketIntervalMs(newBucket, cardImportance) },
    }
    setProgress(newProgress)
    saveProgress(newProgress)
    if (user) saveToCloud(user.id, cloudState({ progress: newProgress }))
    setGraduated(g => g + 1)
    setCurrentCardId(null)
    setRevealed(false)
    setNotesOpen(false)
    setEditOpen(false)
  }

  // Keyboard shortcuts: Space = flip, 1–5 = rate(−2..+2)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key === ' ') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
        return
      }
      if (!revealed || !card) return
      const deltaMap: Record<string, number> = { '1': -2, '2': -1, '3': 0, '4': 1, '5': 2 }
      const delta = deltaMap[e.key]
      if (delta !== undefined) {
        const newBucket = Math.max(0, Math.min(MAX_BUCKET, bucket + delta))
        const imp = (importanceMap[card.id] ?? 0) as Importance
        const newProgress: ProgressMap = {
          ...progress,
          [card.id]: { bucket: newBucket, nextReview: Date.now() + bucketIntervalMs(newBucket, imp) },
        }
        setProgress(newProgress)
        saveProgress(newProgress)
        if (user) saveToCloud(user.id, cloudState({ progress: newProgress }))
        setGraduated(g => g + 1)
        setCurrentCardId(null)
        setRevealed(false)
        setNotesOpen(false)
        setEditOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [revealed, card, bucket, progress])

  function exportData() {
    const data = {
      overrides: loadOverrides(),
      custom: loadCustomCards(),
      progress: loadProgress(),
      importance: loadImportance(),
      graveyard: [...loadGraveyard()],
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'cpp-flashcards-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function resetProgress() {
    const cleared: ProgressMap = {}
    setProgress(cleared)
    saveProgress(cleared)
    setRevealed(false)
    setGraduated(0)
  }

  function handleSaveEdit(q: string, a: string, source: EditSource = 'manual') {
    if (!card) return
    const newOverrides = { ...overrides, [card.id]: { q, a } }
    setOverrides(newOverrides)
    saveOverrides(newOverrides)
    if (user) saveOverrideToCloud(user.id, card.id, q, a, cloudState({ overrides: newOverrides }), source)
  }

  function handleArchive() {
    if (!card) return
    const newGraveyard = new Set(graveyard)
    newGraveyard.add(card.id)
    setGraveyard(newGraveyard)
    saveGraveyard(newGraveyard)
    if (user) saveToCloud(user.id, cloudState({ graveyard: [...newGraveyard] }))
    setCurrentCardId(null)
    setRevealed(false)
    setGraduated(g => g + 1)
  }

  function handleSaveNew(q: string, a: string) {
    const id  = Date.now()
    const ch  = chapter === 'all' ? (CHAPTERS[0] ?? '0') : chapter
    const newCard: Flashcard = { id, chapter: ch, topic: 'Custom', noteSection: '', q, a }
    const newCustoms = [...customs, newCard]
    setCustoms(newCustoms)
    saveCustomCards(newCustoms)
    if (user) saveToCloud(user.id, cloudState({ custom: newCustoms }))
  }

  const totalSession = graduated + queue.length
  const progressPct  = totalSession > 0 ? (graduated / totalSession) * 100 : 0

  // ── Empty queue ──────────────────────────────────────────────
  if (queue.length === 0) {
    const next   = nextDueTs(progress, cards)
    const total  = cards.length
    const seen   = cards.filter(c => progress[c.id]).length
    const onTime = cards.filter(c => {
      const s = progress[c.id]
      return s && s.bucket > 0 && s.nextReview > Date.now()
    }).length

    return (
      <div className="page">
        <header className="page-header">
          <div className="page-header-left">
            <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
            <span className="page-header-title">C++ Quiz</span>
          </div>
          <HeaderRight options={close => (<>
            <button className="header-toast-item" onClick={() => { close(); changeChapter(chapter) }}>New session</button>
            <button className="header-toast-item" onClick={() => { close(); setAddOpen(true) }}>Add card</button>
            <button className="header-toast-item" onClick={() => { close(); exportData() }}>Export all data</button>
            <button className="header-toast-item" onClick={() => { close(); resetProgress() }}>Reset all progress</button>
          </>)} />
        </header>
        <div className="fq-done-screen">
          <div className="fq-done-check">✓</div>
          <div className="fq-done-title">
            {graduated > 0 ? 'Session done' : 'All caught up'}
          </div>
          <div className="fq-done-stats">
            <div className="fq-stat">
              <span className="fq-stat-val">{seen}</span>
              <span className="fq-stat-label">of {total} seen</span>
            </div>
            <div className="fq-stat-divider" />
            <div className="fq-stat">
              <span className="fq-stat-val">{onTime}</span>
              <span className="fq-stat-label">scheduled</span>
            </div>
          </div>
          {next && (
            <div className="fq-done-next">
              Next card due in <strong>{formatRelative(next)}</strong>
            </div>
          )}
          <button className="btn btn-primary fq-done-restart" onClick={() => changeChapter(chapter)}>
            Study again
          </button>
        </div>
        {addOpen && (
          <EditSheet
            mode="new"
            chapter={chapter === 'all' ? (CHAPTERS[0] ?? '0') : chapter}
            onSave={handleSaveNew}
            onClose={() => setAddOpen(false)}
          />
        )}
      </div>
    )
  }

  // ── Session ──────────────────────────────────────────────────
  if (!card) return null
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">C++ Quiz</span>
        </div>
        <HeaderRight options={close => (<>
          <button className="header-toast-item" onClick={() => { close(); changeChapter(chapter) }}>Restart session</button>
          <button className="header-toast-item" onClick={() => { close(); exportData() }}>Export all data</button>
          <button className="header-toast-item" onClick={() => { close(); resetProgress() }}>Reset all progress</button>
          {graveyard.size > 0 && (
            <button className="header-toast-item" onClick={() => { close(); setGraveyard(new Set()); saveGraveyard(new Set()) }}>
              Restore all ({graveyard.size} archived)
            </button>
          )}
        </>)} />
      </header>

      {/* Chapter filter */}
      <div className="fq-topics">
        <button
          className={`fq-pill${chapter === 'all' ? ' fq-pill-active' : ''}`}
          onClick={() => changeChapter('all')}
        >
          All ({getCards('all', overrides, customs, 'all', importanceMap, graveyard).length})
        </button>
        {CHAPTERS.map(ch => (
          <button
            key={ch}
            className={`fq-pill${chapter === ch ? ' fq-pill-active' : ''}`}
            onClick={() => changeChapter(ch)}
          >
            {CHAPTER_NAMES[ch]} ({getCards(ch, overrides, customs, 'all', importanceMap, graveyard).length})
          </button>
        ))}
      </div>

      {/* Importance filter */}
      <div className="fq-topics fq-importance-filter">
        <button
          className={`fq-pill${importanceFilter === 'all' ? ' fq-pill-active' : ''}`}
          onClick={() => setImpFilter('all')}
        >All</button>
        {([-2, -1, 0, 1, 2] as Importance[]).map(v => (
          <button
            key={v}
            className={`fq-pill fq-imp-pill-${v < 0 ? 'n' : ''}${Math.abs(v)}${importanceFilter === v ? ' fq-pill-active' : ''}`}
            onClick={() => setImpFilter(v)}
          >
            {IMPORTANCE_NAMES[v]}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="fq-progress">
        <div className="fq-progress-bar">
          <div className="fq-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="fq-progress-text">
          {graduated} done · {queue.length} left
        </div>
      </div>

      {/* Card */}
      <div className="fq-body">
        <div className={`fq-card-area${addOpen ? ' fq-card-area-split' : ''}`}>
        <div className={`fq-card${revealed ? ' fq-card-revealed' : ''}`}>

          {/* Question — always visible */}
          <div className="fq-card-q">
            <div className="fq-badges">
              <span className="fq-topic-badge">{card.topic}</span>
              {cardImportance !== 0 && (
                <span className={`fq-imp-badge fq-imp-badge-${cardImportance < 0 ? 'n' : ''}${Math.abs(cardImportance)}`}>
                  {IMPORTANCE_NAMES[cardImportance]}
                </span>
              )}
            </div>
            <CardText text={card.q} className="fq-q-text" />
            <BucketBar bucket={bucket} nextReview={card ? progress[card.id]?.nextReview : undefined} />
          </div>

          {/* Answer — click to reveal */}
          <div
            className={`fq-card-a${revealed ? ' fq-card-a-revealed' : ''}`}
            onClick={() => { if (!revealed && !window.getSelection()?.toString()) setRevealed(true) }}
            role={revealed ? undefined : 'button'}
          >
            {revealed
              ? <CardText text={card.a} className="fq-a-text" />
              : <span className="fq-reveal-hint">Click here or press Space to see answer</span>
            }
          </div>
        </div>

        {/* Inline add card panel */}
        {addOpen && (
          <AddCardPanel
            chapter={chapter === 'all' ? (CHAPTERS[0] ?? '0') : chapter}
            onSave={handleSaveNew}
            onClose={() => setAddOpen(false)}
          />
        )}
        </div>{/* end fq-card-area */}

        {/* Post-reveal actions */}
        {revealed && (
          <div className="fq-card-actions">
            {card.noteSection && (
              <button className="fq-action-btn" onClick={() => setNotesOpen(true)}>▼ Notes</button>
            )}
            <button className="fq-action-btn" onClick={() => setEditOpen(true)}>✎ Edit</button>
            <button className="fq-action-btn fq-action-archive" onClick={handleArchive}>⊗ Archive</button>
            <button
              className={`fq-action-btn${addOpen ? ' fq-action-btn-active' : ''}`}
              onClick={() => setAddOpen(o => !o)}
            >＋ Add</button>
          </div>
        )}

        {/* Bucket status + rating buttons */}
        {revealed && (
          <div className="fq-bucket-status">
            Bucket {bucket} · next in {formatInterval(bucketIntervalMs(bucket, cardImportance))}
          </div>
        )}
        <div className="fq-ratings">
          {([-2, -1, 0, 1, 2] as const).map((delta, i) => {
            const newBucket = Math.max(0, Math.min(MAX_BUCKET, bucket + delta))
            const label = delta > 0 ? `+${delta}` : delta === 0 ? '=' : `${delta}`
            const colorClass = ['fq-rate-1','fq-rate-2','fq-rate-3','fq-rate-4','fq-rate-5'][i]
            return (
              <button
                key={delta}
                className={`fq-rate-btn ${colorClass}`}
                onClick={() => rate(delta)}
                disabled={!revealed}
                title={`Key ${i + 1}`}
              >
                <span className="fq-rate-delta">{label}</span>
                <span className="fq-rate-result">bkt {newBucket}</span>
                <span className="fq-rate-time">{formatInterval(bucketIntervalMs(newBucket))}</span>
              </button>
            )
          })}
        </div>

        {/* Importance selector */}
        {card && (
          <div className="fq-importance-selector">
            <span className="fq-importance-label">Importance</span>
            <div className="fq-importance-row">
              {([-2, -1, 0, 1, 2] as Importance[]).map(v => (
                <button
                  key={v}
                  className={`fq-imp-btn fq-imp-${v < 0 ? 'n' : ''}${Math.abs(v)}${cardImportance === v ? ' fq-imp-active' : ''}`}
                  onClick={() => {
                    const newImpMap = { ...importanceMap, [card.id]: v }
                    setImportanceMap(newImpMap)
                    saveImportance(newImpMap)
                    if (user) saveToCloud(user.id, cloudState({ importance: newImpMap }))
                  }}
                >
                  {IMPORTANCE_NAMES[v]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sheets */}
      {notesOpen && card && (
        <NotesSheet card={card} onClose={() => setNotesOpen(false)} />
      )}
      {editOpen && card && (
        <EditSheet
          mode="edit"
          card={card}
          chapter={card.chapter}
          onSave={handleSaveEdit}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}
