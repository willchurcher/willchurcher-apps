import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { marked } from 'marked'
import { HeaderRight } from './HeaderRight'
import type { Flashcard } from './cpp-flashcards-data'

type FlashcardV2 = Flashcard & { baseImportance: number; lesson: string; lessonTitle: string }
import { callClaude } from './claude-utils'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'
import { loadFromCloud, saveToCloud, saveOverrideToCloud, type CppCloudData, type EditSource } from './cpp-flashcards-db'

// ── SRS constants ──────────────────────────────────────────────
const A_MS          = 60 * 1000
const MAX_BUCKET    = 14
const STORAGE_KEY   = 'cpp-fc2-progress'
const OVERRIDES_KEY = 'cpp-fc2-overrides'
const CUSTOM_KEY    = 'cpp-fc2-custom'
const IMPORTANCE_KEY  = 'cpp-fc2-importance'
const GRAVEYARD_KEY   = 'cpp-fc2-graveyard'

// importance: -2=very low, -1=low, 0=medium, 1=high, 2=very high
export type Importance = -2 | -1 | 0 | 1 | 2
type StudyMode = 'scheduled' | 'shuffle' | 'linear'
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
  baseCards: Flashcard[] = [],
  lessonFilter = 'all',
): Flashcard[] {
  const base = chapter === 'all' ? baseCards : baseCards.filter(c => c.chapter === chapter)
  const withOverrides = applyOverrides(base, overrides)
  const filtered = chapter === 'all' ? customs : customs.filter(c => c.chapter === chapter)
  let all = [...withOverrides, ...filtered].filter(c => !graveyard.has(c.id))
  if (lessonFilter !== 'all') all = all.filter(c => (c as FlashcardV2).lesson === lessonFilter)
  if (importanceFilter === 'all') return all
  return all.filter(c => effImp(c, importanceMap) === importanceFilter)
}

// Effective importance: user override wins, then DB base, then 0
function effImp(c: Flashcard, map: ImportanceMap): Importance {
  if (map[c.id] !== undefined) return map[c.id] as Importance
  return (((c as FlashcardV2).baseImportance ?? 0) as Importance)
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
    // chapters are zero-padded ("01") — strip for filename ("cpp-chapter-1.md")
    const n = parseInt(chapter, 10)
    const chStr = isNaN(n) ? chapter.toLowerCase() : String(n)
    const md = await fetch(`/notes/cpp-chapter-${chStr}.md`).then(r => r.text())
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
  onSaveNew?: (q: string, a: string, importance: Importance) => void
  onClose: () => void
}

function EditSheet({ mode, card, chapter, onSave, onSaveNew, onClose }: EditSheetProps) {
  const [q, setQ]             = useState(card?.q ?? '')
  const [a, setA]             = useState(card?.a ?? '')
  const [aiNote, setAiNote]   = useState('')
  const [importance, setImp]  = useState<Importance>(0)
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
    if (mode === 'new' && onSaveNew) {
      onSaveNew(q.trim(), a.trim(), importance)
    } else {
      onSave(q.trim(), a.trim(), aiUsed ? 'ai-enhance' : 'manual')
    }
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

          {mode === 'new' && onSaveNew && (
            <div className="fq-importance-selector">
              <span className="fq-importance-label">Importance</span>
              <div className="fq-importance-row">
                {([-2, -1, 0, 1, 2] as Importance[]).map(v => (
                  <button
                    key={v}
                    className={`fq-imp-btn fq-imp-${v < 0 ? 'n' : ''}${Math.abs(v)}${importance === v ? ' fq-imp-active' : ''}`}
                    onClick={() => setImp(v)}
                  >{v > 0 ? `+${v}` : v}</button>
                ))}
              </div>
            </div>
          )}

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
  onSave: (q: string, a: string, importance: Importance) => void
  onClose: () => void
}) {
  const [q, setQ]             = useState('')
  const [a, setA]             = useState('')
  const [aiNote, setAiNote]   = useState('')
  const [importance, setImp]  = useState<Importance>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

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
    onSave(q.trim(), a.trim(), importance)
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
        <div className="fq-importance-selector">
          <span className="fq-importance-label">Importance</span>
          <div className="fq-importance-row">
            {([-2, -1, 0, 1, 2] as Importance[]).map(v => (
              <button
                key={v}
                className={`fq-imp-btn fq-imp-${v < 0 ? 'n' : ''}${Math.abs(v)}${importance === v ? ' fq-imp-active' : ''}`}
                onClick={() => setImp(v)}
              >{v > 0 ? `+${v}` : v}</button>
            ))}
          </div>
        </div>
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
export default function CppFlashcardsV2() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [allCards, setAllCards]           = useState<FlashcardV2[]>([])
  const [cardsLoading, setCardsLoading]   = useState(true)
  const [chapter, setChapter]             = useState(() => localStorage.getItem('cpp-fc2-chapter') ?? 'all')
  const [progress, setProgress]           = useState<ProgressMap>(loadProgress)
  const [overrides, setOverrides]         = useState<OverridesMap>(loadOverrides)
  const [customs, setCustoms]             = useState<Flashcard[]>(loadCustomCards)
  const [importanceMap, setImportanceMap] = useState<ImportanceMap>(loadImportance)
  const [importanceFilter, setImpFilter]  = useState<Importance | 'all'>(() => {
    const v = localStorage.getItem('cpp-fc2-imp-filter')
    return (v == null || v === 'all') ? 'all' : Number(v) as Importance
  })
  const [lessonFilter, setLessonFilter]   = useState<string>(() => localStorage.getItem('cpp-fc2-lesson-filter') ?? 'all')
  const [graveyard, setGraveyard]         = useState<Set<number>>(loadGraveyard)
  const [revealed, setRevealed]           = useState(false)
  const [graduated, setGraduated]         = useState(0)
  const [notesOpen, setNotesOpen]         = useState(false)
  const [editOpen, setEditOpen]           = useState(false)
  const [addOpen, setAddOpen]             = useState(false)
  const [browseMode, setBrowseMode]       = useState(false)
  const [studyMode, setStudyMode]         = useState<StudyMode>(() => (localStorage.getItem('cpp-fc2-study-mode') as StudyMode) ?? 'scheduled')
  const [browseQueue, setBrowseQueue]     = useState<Flashcard[]>([])
  const [browseIdx, setBrowseIdx]         = useState(0)
  // Tracks which card is being studied — prevents queue reshuffles from swapping the card mid-session
  const [currentCardId, setCurrentCardId] = useState<number | null>(null)
  const cloudSynced = useRef(false)

  // ── Load cards from cpp_flashcards_v3 table ───────────────────
  useEffect(() => {
    supabase
      .from('cpp_flashcards_v3')
      .select('id, chapter, lesson_number, lesson_title, topic, note_section, q, a, importance')
      .order('chapter', { ascending: true })
      .order('lesson_number', { ascending: true })
      .order('id', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setAllCards(data.map(row => ({
            id: row.id,
            chapter: row.chapter,
            lesson: row.lesson_number ?? '',
            lessonTitle: row.lesson_title ?? '',
            topic: row.topic,
            noteSection: row.note_section,
            q: row.q,
            a: row.a,
            baseImportance: row.importance ?? 0,
          })))
        }
        setCardsLoading(false)
      })
  }, [])

  const CHAPTERS = [...new Set(allCards.map(c => c.chapter))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )
  const CHAPTER_NAMES: Record<string, string> = Object.fromEntries(
    CHAPTERS.map(ch => {
      const n = parseInt(ch, 10)
      return [ch, `Ch. ${isNaN(n) ? ch : n}`]
    })
  )

  // ── Cloud sync ────────────────────────────────────────────────
  // On login: load from Supabase and apply (Supabase is source of truth)
  useEffect(() => {
    if (!user || cloudSynced.current) return
    cloudSynced.current = true
    loadFromCloud(user.id).then(remote => {
      if (!remote) return
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
    () => getCards(chapter, {}, customs, importanceFilter, importanceMap, graveyard, allCards, lessonFilter),
    [chapter, customs, importanceFilter, importanceMap, graveyard, allCards, lessonFilter]
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
  const activeRaw = studyMode === 'scheduled' ? cardRaw : (browseQueue[browseIdx] ?? null)
  const card = activeRaw && overrides[activeRaw.id]
    ? { ...activeRaw, ...overrides[activeRaw.id] }
    : activeRaw
  const bucket = card ? (progress[card.id]?.bucket ?? 0) : 0
  const cardImportance = card ? effImp(card, importanceMap) : 0

  function changeChapter(ch: string) {
    setChapter(ch)
    localStorage.setItem('cpp-fc2-chapter', ch)
    setLessonFilter('all')
    localStorage.setItem('cpp-fc2-lesson-filter', 'all')
    setRevealed(false)
    setGraduated(0)
    setNotesOpen(false)
    setEditOpen(false)
  }

  function switchMode(mode: StudyMode) {
    setStudyMode(mode)
    localStorage.setItem('cpp-fc2-study-mode', mode)
    setRevealed(false)
    setBrowseIdx(0)
  }

  useEffect(() => {
    if (studyMode === 'scheduled') return
    const newQ = studyMode === 'shuffle'
      ? [...cards].sort(() => Math.random() - 0.5)
      : [...cards]
    setBrowseQueue(newQ)
    setBrowseIdx(0)
  }, [studyMode, chapter, importanceFilter, lessonFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  function browseNext() {
    if (browseQueue.length === 0) return
    setRevealed(false)
    setBrowseIdx(i => (i + 1) % browseQueue.length)
  }

  function browsePrev() {
    if (browseQueue.length === 0) return
    setRevealed(false)
    setBrowseIdx(i => (i - 1 + browseQueue.length) % browseQueue.length)
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

  // Keyboard shortcuts: Space = flip, 1–5 = rate (SRS), ArrowLeft/Right = browse nav
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key === ' ') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
        return
      }
      if (studyMode !== 'scheduled') {
        if (e.key === 'ArrowRight') { e.preventDefault(); browseNext() }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); browsePrev() }
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
  }, [revealed, card, bucket, progress, studyMode, browseIdx, browseQueue])

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
    if (studyMode !== 'scheduled') {
      const newQ = browseQueue.filter(c => c.id !== card.id)
      setBrowseQueue(newQ)
      setBrowseIdx(i => Math.min(i, Math.max(0, newQ.length - 1)))
    } else {
      setCurrentCardId(null)
      setGraduated(g => g + 1)
    }
    setRevealed(false)
  }

  function handleSaveNew(q: string, a: string, importance: Importance) {
    const id  = Date.now()
    const ch  = chapter === 'all' ? (CHAPTERS[0] ?? '1') : chapter
    const newCard: Flashcard = { id, chapter: ch, topic: 'Custom', noteSection: '', q, a }
    const newCustoms = [...customs, newCard]
    setCustoms(newCustoms)
    saveCustomCards(newCustoms)
    // Set importance
    const newImpMap = { ...importanceMap, [id]: importance }
    setImportanceMap(newImpMap)
    saveImportance(newImpMap)
    // Mark as seen + due immediately so it surfaces right away
    const newProgress = { ...progress, [id]: { bucket: 0, nextReview: Date.now() } }
    setProgress(newProgress)
    saveProgress(newProgress)
    if (user) saveToCloud(user.id, cloudState({ custom: newCustoms, importance: newImpMap }))
  }

  const totalSession = graduated + queue.length
  const progressPct  = totalSession > 0 ? (graduated / totalSession) * 100 : 0

  // ── Filter counts ─────────────────────────────────────────────
  const allInChapter = getCards(chapter, overrides, customs, 'all', importanceMap, graveyard, allCards, lessonFilter)
  const impCounts = Object.fromEntries(
    ([-2, -1, 0, 1, 2] as Importance[]).map(v => [
      v, allInChapter.filter(c => effImp(c, importanceMap) === v).length
    ])
  ) as Record<number, number>
  const chapterAllCount = getCards('all', overrides, customs, importanceFilter, importanceMap, graveyard, allCards, lessonFilter).length

  // Lessons available for the current chapter selection (with known lesson values)
  const lessonOptions = useMemo(() => {
    const base = chapter === 'all' ? allCards : allCards.filter(c => c.chapter === chapter)
    const seen = new Map<string, string>() // lesson → lessonTitle
    for (const c of base) {
      if (c.lesson && !seen.has(c.lesson)) seen.set(c.lesson, c.lessonTitle)
    }
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
  }, [chapter, allCards])

  // ── Done-screen stats ─────────────────────────────────────────
  const doneNext   = nextDueTs(progress, cards)
  const doneTotal  = cards.length
  const doneSeen   = cards.filter(c => progress[c.id]).length
  const doneOnTime = cards.filter(c => {
    const s = progress[c.id]
    return s && s.bucket > 0 && s.nextReview > Date.now()
  }).length

  // ── Loading ───────────────────────────────────────────────────
  if (cardsLoading) return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">C++ Cards</span>
        </div>
      </header>
      <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '4rem 2rem' }}>Loading cards…</div>
    </div>
  )

  // ── Unified render ────────────────────────────────────────────
  // (replaces separate done-screen and session returns)
  // ── Empty queue ──────────────────────────────────────────────
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">C++ Cards</span>
        </div>
        <HeaderRight options={close => (<>
          {queue.length > 0 && !browseMode && studyMode === 'scheduled' && (
            <button className="header-toast-item" onClick={() => { close(); changeChapter(chapter) }}>Restart session</button>
          )}
          <button className="header-toast-item" onClick={() => { close(); setBrowseMode(b => !b) }}>
            {browseMode ? 'Exit browse' : 'Browse all cards'}
          </button>
          <div className="header-toast-select-row">
            <span className="header-toast-select-label">Mode</span>
            <select
              className="header-toast-select"
              value={studyMode}
              onChange={e => switchMode(e.target.value as StudyMode)}
            >
              <option value="scheduled">Scheduled</option>
              <option value="shuffle">Shuffle</option>
              <option value="linear">Linear</option>
            </select>
          </div>
          <button className="header-toast-item" onClick={() => { close(); setAddOpen(true) }}>Add card</button>
          <button className="header-toast-item" onClick={() => { close(); exportData() }}>Export all data</button>
          <button className="header-toast-item" onClick={() => { close(); resetProgress() }}>Reset all progress</button>
          {graveyard.size > 0 && (
            <button className="header-toast-item" onClick={() => { close(); setGraveyard(new Set()); saveGraveyard(new Set()) }}>
              Restore all ({graveyard.size} archived)
            </button>
          )}
        </>)} />
      </header>

      {/* Filter row — always visible */}
      <div className="fq-filter-row">
        <select
          className="fq-filter-select"
          value={chapter}
          onChange={e => changeChapter(e.target.value)}
        >
          <option value="all">All chapters ({chapterAllCount})</option>
          {CHAPTERS.map(ch => {
            const count = getCards(ch, overrides, customs, importanceFilter, importanceMap, graveyard, allCards).length
            return <option key={ch} value={ch}>{CHAPTER_NAMES[ch]} ({count})</option>
          })}
        </select>
        <select
          className="fq-filter-select"
          value={String(importanceFilter)}
          onChange={e => {
            const v = e.target.value
            setImpFilter(v === 'all' ? 'all' : Number(v) as Importance)
            localStorage.setItem('cpp-fc2-imp-filter', v)
            setRevealed(false)
            setGraduated(0)
            setCurrentCardId(null)
          }}
        >
          <option value="all">All ({allInChapter.length})</option>
          {([-2, -1, 0, 1, 2] as Importance[]).map(v => (
            <option key={v} value={String(v)}>{IMPORTANCE_NAMES[v]} ({impCounts[v]})</option>
          ))}
        </select>
        {lessonOptions.length > 0 && (
          <select
            className="fq-filter-select"
            value={lessonFilter}
            onChange={e => {
              setLessonFilter(e.target.value)
              localStorage.setItem('cpp-fc2-lesson-filter', e.target.value)
              setRevealed(false)
              setGraduated(0)
              setCurrentCardId(null)
            }}
          >
            <option value="all">All lessons</option>
            {lessonOptions.map(([lesson, title]) => {
              const count = getCards(chapter, overrides, customs, importanceFilter, importanceMap, graveyard, allCards, lesson).length
              return <option key={lesson} value={lesson}>{lesson} — {title} ({count})</option>
            })}
          </select>
        )}
      </div>

      {/* Browse mode */}
      {browseMode ? (
        <div className="fq-browse-list">
          {cards.length === 0
            ? <p className="fq-browse-empty">No cards match this filter.</p>
            : cards.map(c => {
                const dc = overrides[c.id] ? { ...c, ...overrides[c.id] } : c
                const imp = effImp(c, importanceMap)
                return (
                  <div key={c.id} className="fq-browse-card">
                    <div className="fq-badges">
                      <span className="fq-topic-badge">{dc.topic}</span>
                      {imp !== 0 && (
                        <span className={`fq-imp-badge fq-imp-badge-${imp < 0 ? 'n' : ''}${Math.abs(imp)}`}>
                          {IMPORTANCE_NAMES[imp]}
                        </span>
                      )}
                    </div>
                    <CardText text={dc.q} className="fq-browse-q" />
                    <CardText text={dc.a} className="fq-browse-a" />
                  </div>
                )
              })
          }
        </div>

      /* No cards match filter */
      ) : cards.length === 0 ? (
        <div className="fq-done-screen">
          <div className="fq-done-title" style={{ marginTop: '3rem' }}>No cards match this filter</div>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '0 2rem' }}>
            Try a different chapter or importance level above.
          </p>
        </div>

      /* Session done / all caught up */
      ) : queue.length === 0 ? (
        <div className="fq-done-screen">
          <div className="fq-done-check">✓</div>
          <div className="fq-done-title">
            {graduated > 0 ? 'Session done' : 'All caught up'}
          </div>
          <div className="fq-done-stats">
            <div className="fq-stat">
              <span className="fq-stat-val">{doneSeen}</span>
              <span className="fq-stat-label">of {doneTotal} seen</span>
            </div>
            <div className="fq-stat-divider" />
            <div className="fq-stat">
              <span className="fq-stat-val">{doneOnTime}</span>
              <span className="fq-stat-label">scheduled</span>
            </div>
          </div>
          {doneNext && (
            <div className="fq-done-next">
              Next card due in <strong>{formatRelative(doneNext)}</strong>
            </div>
          )}
          <button className="btn btn-primary fq-done-restart" onClick={() => changeChapter(chapter)}>
            Study again
          </button>
        </div>

      /* Active session */
      ) : card ? (
        <>
          {/* Progress */}
          <div className="fq-progress">
            <div className="fq-progress-bar">
              <div className="fq-progress-fill" style={{ width: studyMode === 'scheduled' ? `${progressPct}%` : `${browseQueue.length > 0 ? ((browseIdx + 1) / browseQueue.length) * 100 : 0}%` }} />
            </div>
            <div className="fq-progress-text">
              {studyMode === 'scheduled'
                ? `${graduated} done · ${queue.length} left`
                : `${browseIdx + 1} of ${browseQueue.length} · ${studyMode === 'shuffle' ? 'shuffle' : 'linear'}`}
            </div>
          </div>

          {/* Card */}
          <div className="fq-body">
            <div className={`fq-card-area${addOpen ? ' fq-card-area-split' : ''}`}>
              <div className={`fq-card${revealed ? ' fq-card-revealed' : ''}`}>
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
                  {studyMode === 'scheduled' && <BucketBar bucket={bucket} nextReview={card ? progress[card.id]?.nextReview : undefined} />}
                </div>
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
              {addOpen && (
                <AddCardPanel
                  chapter={chapter === 'all' ? (CHAPTERS[0] ?? '1') : chapter}
                  onSave={handleSaveNew}
                  onClose={() => setAddOpen(false)}
                />
              )}
            </div>

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

            {studyMode === 'scheduled' ? (<>
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
            </>) : (
              <div className="fq-browse-nav">
                <button className="btn fq-browse-btn" onClick={browsePrev}>← Prev</button>
                <button className="btn btn-primary fq-browse-btn" onClick={browseNext}>Next →</button>
              </div>
            )}

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
          </div>
        </>
      ) : null}

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
      {addOpen && (browseMode || queue.length === 0) && (
        <EditSheet
          mode="new"
          chapter={chapter === 'all' ? (CHAPTERS[0] ?? '1') : chapter}
          onSave={() => {}}
          onSaveNew={handleSaveNew}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  )
}
