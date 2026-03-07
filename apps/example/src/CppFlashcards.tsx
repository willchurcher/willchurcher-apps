import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { marked } from 'marked'
import { HeaderRight } from './HeaderRight'
import { FLASHCARDS, CHAPTERS, CHAPTER_NAMES, type Flashcard } from './cpp-flashcards-data'
import { callClaude } from './claude-utils'

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

function computeQueue(cards: Flashcard[], progress: ProgressMap, importanceMap: ImportanceMap): Flashcard[] {
  const now = Date.now()
  const due: Flashcard[]    = []
  const unseen: Flashcard[] = []

  for (const c of cards) {
    const s   = progress[c.id]
    const imp = (importanceMap[c.id] ?? 0) as Importance
    if (!s) {
      unseen.push(c)
    } else {
      // Adjust effective due time by importance: high importance = see sooner
      const effective = s.nextReview * (IMPORTANCE_FACTOR[imp] ?? 1)
      if (effective <= now) due.push(c)
    }
  }

  due.sort((a, b) => (progress[a.id]?.nextReview ?? 0) - (progress[b.id]?.nextReview ?? 0))
  for (let i = unseen.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[unseen[i], unseen[j]] = [unseen[j], unseen[i]]
  }
  return [...due, ...unseen]
}

function nextDueTs(progress: ProgressMap, cards: Flashcard[], importanceMap: ImportanceMap): number | null {
  const now = Date.now()
  let earliest: number | null = null
  for (const c of cards) {
    const s   = progress[c.id]
    const imp = (importanceMap[c.id] ?? 0) as Importance
    if (!s) continue
    const effective = s.nextReview * (IMPORTANCE_FACTOR[imp] ?? 1)
    if (effective <= now) continue
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

// ── Inline markdown renderer ───────────────────────────────────
function CardText({ text, className }: { text: string; className: string }) {
  const lines = text.split('\n')
  return (
    <p className={className}>
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          <span dangerouslySetInnerHTML={{ __html: marked.parseInline(line) as string }} />
        </span>
      ))}
    </p>
  )
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
  initialImportance?: Importance
  onSave: (q: string, a: string, importance: Importance) => void
  onClose: () => void
}

function EditSheet({ mode, card, chapter, initialImportance = 0, onSave, onClose }: EditSheetProps) {
  const [q, setQ]             = useState(card?.q ?? '')
  const [a, setA]             = useState(card?.a ?? '')
  const [aiNote, setAiNote]   = useState('')
  const [importance, setImp]  = useState<Importance>(initialImportance)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  function handleSave() {
    if (!q.trim() || !a.trim()) return
    onSave(q.trim(), a.trim(), importance)
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
      if (json.answer) setA(json.answer)
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

          <label className="fq-edit-label">Importance</label>
          <div className="fq-importance-row">
            {([-2, -1, 0, 1, 2] as Importance[]).map(v => (
              <button
                key={v}
                className={`fq-imp-btn fq-imp-${v < 0 ? 'n' : ''}${Math.abs(v)}${importance === v ? ' fq-imp-active' : ''}`}
                onClick={() => setImp(v)}
              >
                {IMPORTANCE_NAMES[v]}
              </button>
            ))}
          </div>

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

// ── Bucket bar ─────────────────────────────────────────────────
function BucketBar({ bucket }: { bucket: number }) {
  const pct   = Math.min(bucket / MAX_BUCKET, 1)
  const nextMs = bucketIntervalMs(bucket)
  return (
    <div className="fq-bucket-row" title={`Bucket ${bucket} · interval ${formatInterval(nextMs)}`}>
      <div className="fq-bucket-bar">
        <div className="fq-bucket-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="fq-bucket-label">{bucket}/{MAX_BUCKET} · {formatInterval(nextMs)}</span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function CppFlashcards() {
  const navigate = useNavigate()
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

  const cards  = useMemo(
    () => getCards(chapter, overrides, customs, importanceFilter, importanceMap, graveyard),
    [chapter, overrides, customs, importanceFilter, importanceMap, graveyard]
  )
  const queue  = useMemo(() => computeQueue(cards, progress, importanceMap), [cards, progress, importanceMap])
  const card   = queue[0]
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
    setGraduated(g => g + 1)
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
        setGraduated(g => g + 1)
        setRevealed(false)
        setNotesOpen(false)
        setEditOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [revealed, card, bucket, progress])

  function resetProgress() {
    const cleared: ProgressMap = {}
    setProgress(cleared)
    saveProgress(cleared)
    setRevealed(false)
    setGraduated(0)
  }

  function handleSaveEdit(q: string, a: string, imp: Importance) {
    if (!card) return
    const newOverrides = { ...overrides, [card.id]: { q, a } }
    setOverrides(newOverrides)
    saveOverrides(newOverrides)
    const newImpMap = { ...importanceMap, [card.id]: imp }
    setImportanceMap(newImpMap)
    saveImportance(newImpMap)
  }

  function handleArchive() {
    if (!card) return
    const newGraveyard = new Set(graveyard)
    newGraveyard.add(card.id)
    setGraveyard(newGraveyard)
    saveGraveyard(newGraveyard)
    setRevealed(false)
    setGraduated(g => g + 1)
  }

  function handleSaveNew(q: string, a: string, imp: Importance) {
    const id  = Date.now()
    const ch  = chapter === 'all' ? (CHAPTERS[0] ?? '0') : chapter
    const newCard: Flashcard = { id, chapter: ch, topic: 'Custom', noteSection: '', q, a }
    const newCustoms = [...customs, newCard]
    setCustoms(newCustoms)
    saveCustomCards(newCustoms)
    const newImpMap = { ...importanceMap, [id]: imp }
    setImportanceMap(newImpMap)
    saveImportance(newImpMap)
  }

  const totalSession = graduated + queue.length
  const progressPct  = totalSession > 0 ? (graduated / totalSession) * 100 : 0

  // ── Empty queue ──────────────────────────────────────────────
  if (queue.length === 0) {
    const next   = nextDueTs(progress, cards, importanceMap)
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
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">C++ Quiz</span>
        </div>
        <HeaderRight options={close => (<>
          <button className="header-toast-item" onClick={() => { close(); changeChapter(chapter) }}>Restart session</button>
          <button className="header-toast-item" onClick={() => { close(); setAddOpen(true) }}>Add card</button>
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
            <BucketBar bucket={bucket} />
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

        {/* Post-reveal actions */}
        {revealed && (
          <div className="fq-card-actions">
            {card.noteSection && (
              <button className="fq-action-btn" onClick={() => setNotesOpen(true)}>▼ Notes</button>
            )}
            <button className="fq-action-btn" onClick={() => setEditOpen(true)}>✎ Edit</button>
            <button className="fq-action-btn fq-action-archive" onClick={handleArchive}>⊗ Archive</button>
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
          initialImportance={cardImportance}
          onSave={handleSaveEdit}
          onClose={() => setEditOpen(false)}
        />
      )}
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
