import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { marked } from 'marked'
import { HeaderRight } from './HeaderRight'
import { FLASHCARDS, CHAPTERS, CHAPTER_NAMES, type Flashcard } from './cpp-flashcards-data'

// ── SRS constants ──────────────────────────────────────────────
const A_MS = 60 * 1000
const MAX_BUCKET = 14
const STORAGE_KEY   = 'cpp-fc-progress'
const OVERRIDES_KEY = 'cpp-fc-overrides'
const CUSTOM_KEY    = 'cpp-fc-custom'

function bucketIntervalMs(bucket: number): number {
  return A_MS * Math.pow(2, bucket)
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

// ── Queue logic ────────────────────────────────────────────────
function applyOverrides(cards: Flashcard[], overrides: OverridesMap): Flashcard[] {
  return cards.map(c => {
    const o = overrides[c.id]
    return o ? { ...c, q: o.q, a: o.a } : c
  })
}

function getCards(chapter: string, overrides: OverridesMap, customs: Flashcard[]): Flashcard[] {
  const base = chapter === 'all' ? FLASHCARDS : FLASHCARDS.filter(c => c.chapter === chapter)
  const withOverrides = applyOverrides(base, overrides)
  const filtered = chapter === 'all' ? customs : customs.filter(c => c.chapter === chapter)
  return [...withOverrides, ...filtered]
}

function computeQueue(cards: Flashcard[], progress: ProgressMap): Flashcard[] {
  const now = Date.now()
  const due: Flashcard[]    = []
  const unseen: Flashcard[] = []

  for (const c of cards) {
    const s = progress[c.id]
    if (!s)                       unseen.push(c)
    else if (s.nextReview <= now) due.push(c)
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
    if (!s || s.nextReview <= now) continue
    if (earliest === null || s.nextReview < earliest) earliest = s.nextReview
  }
  return earliest
}

// ── AI helpers ─────────────────────────────────────────────────
async function callClaude(prompt: string): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) throw new Error('API error')
  const data = await res.json()
  return data.text
}

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
  onSave: (q: string, a: string) => void
  onClose: () => void
}

function EditSheet({ mode, card, chapter, onSave, onClose }: EditSheetProps) {
  const [q, setQ]         = useState(card?.q ?? '')
  const [a, setA]         = useState(card?.a ?? '')
  const [aiNote, setAiNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  function handleSave() {
    if (!q.trim() || !a.trim()) return
    onSave(q.trim(), a.trim())
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
      const text   = await callClaude(prompt)
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
  const [chapter, setChapter]       = useState('all')
  const [progress, setProgress]     = useState<ProgressMap>(loadProgress)
  const [overrides, setOverrides]   = useState<OverridesMap>(loadOverrides)
  const [customs, setCustoms]       = useState<Flashcard[]>(loadCustomCards)
  const [revealed, setRevealed]     = useState(false)
  const [graduated, setGraduated]   = useState(0)
  const [notesOpen, setNotesOpen]   = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [addOpen, setAddOpen]       = useState(false)

  const cards = useMemo(() => getCards(chapter, overrides, customs), [chapter, overrides, customs])
  const queue = useMemo(() => computeQueue(cards, progress), [cards, progress])
  const card  = queue[0]
  const bucket = card ? (progress[card.id]?.bucket ?? 0) : 0

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
      [card.id]: { bucket: newBucket, nextReview: Date.now() + bucketIntervalMs(newBucket) },
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
        const newProgress: ProgressMap = {
          ...progress,
          [card.id]: { bucket: newBucket, nextReview: Date.now() + bucketIntervalMs(newBucket) },
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

  function handleSaveEdit(q: string, a: string) {
    if (!card) return
    const newOverrides = { ...overrides, [card.id]: { q, a } }
    setOverrides(newOverrides)
    saveOverrides(newOverrides)
  }

  function handleSaveNew(q: string, a: string) {
    const id = Date.now()
    const ch  = chapter === 'all' ? (CHAPTERS[0] ?? '0') : chapter
    const newCard: Flashcard = {
      id, chapter: ch, topic: 'Custom', noteSection: '', q, a,
    }
    const newCustoms = [...customs, newCard]
    setCustoms(newCustoms)
    saveCustomCards(newCustoms)
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
        </>)} />
      </header>

      {/* Chapter filter */}
      <div className="fq-topics">
        <button
          className={`fq-pill${chapter === 'all' ? ' fq-pill-active' : ''}`}
          onClick={() => changeChapter('all')}
        >
          All ({getCards('all', overrides, customs).length})
        </button>
        {CHAPTERS.map(ch => (
          <button
            key={ch}
            className={`fq-pill${chapter === ch ? ' fq-pill-active' : ''}`}
            onClick={() => changeChapter(ch)}
          >
            {CHAPTER_NAMES[ch]} ({getCards(ch, overrides, customs).length})
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
        <div
          className={`fq-card${revealed ? ' fq-card-revealed' : ''}`}
          onClick={() => { if (!revealed && !window.getSelection()?.toString()) setRevealed(true) }}
          role="button"
          aria-label="Reveal answer"
        >
          {/* Question face */}
          <div className={`fq-face ${revealed ? 'fq-face-hidden' : 'fq-face-visible'}`}>
            <span className="fq-topic-badge">{card.topic}</span>
            <CardText text={card.q} className="fq-q-text" />
            <div className="fq-front-footer">
              <BucketBar bucket={bucket} />
              <span className="fq-flip-hint">tap to reveal</span>
            </div>
          </div>

          {/* Answer face */}
          <div className={`fq-face ${revealed ? 'fq-face-visible' : 'fq-face-hidden'}`}>
            <span className="fq-answer-label">Answer</span>
            <CardText text={card.a} className="fq-a-text" />
          </div>
        </div>

        {/* Post-reveal actions */}
        {revealed && (
          <div className="fq-card-actions">
            {card.noteSection && (
              <button className="fq-action-btn" onClick={() => setNotesOpen(true)}>
                ▼ See notes
              </button>
            )}
            <button className="fq-action-btn" onClick={() => setEditOpen(true)}>
              ✎ Edit card
            </button>
          </div>
        )}

        {/* Bucket status + rating buttons */}
        {revealed && (
          <div className="fq-bucket-status">
            Bucket {bucket} · next in {formatInterval(bucketIntervalMs(bucket))}
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
