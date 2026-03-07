import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeaderRight } from './HeaderRight'
import { FLASHCARDS, CHAPTERS, CHAPTER_NAMES, type Flashcard } from './cpp-flashcards-data'

// ── SRS constants ──────────────────────────────────────────────
const A_MS = 60 * 1000   // base interval = 60 seconds
const MAX_BUCKET = 14    // bucket 14 ≈ 11 days
const STORAGE_KEY = 'cpp-fc-progress'

// interval = A * 2^bucket  (seconds, then converted to ms)
function bucketIntervalMs(bucket: number): number {
  return A_MS * Math.pow(2, bucket)
}

function formatInterval(ms: number): string {
  const s = ms / 1000
  if (s < 60)   return `${Math.round(s)}s`
  const m = s / 60
  if (m < 60)   return `${Math.round(m)}m`
  const h = m / 60
  if (h < 24)   return `${Math.round(h)}h`
  const d = h / 24
  if (d < 30)   return `${Math.round(d)}d`
  return `${Math.round(d / 7)}w`
}

function formatRelative(ts: number): string {
  return formatInterval(Math.max(0, ts - Date.now()))
}

// ── Progress store ─────────────────────────────────────────────
interface CardState { bucket: number; nextReview: number }
type ProgressMap = Record<number, CardState>
type Rating = 'black' | 'red' | 'yellow' | 'green'

function loadProgress(): ProgressMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  catch { return {} }
}
function saveProgress(p: ProgressMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

// ── Queue logic ────────────────────────────────────────────────
// Priority: seen+due cards first (most overdue = lowest nextReview),
//           unseen cards last (shuffled).
function computeQueue(cards: Flashcard[], progress: ProgressMap): Flashcard[] {
  const now = Date.now()
  const due: Flashcard[]   = []
  const unseen: Flashcard[] = []

  for (const c of cards) {
    const s = progress[c.id]
    if (!s)                        unseen.push(c)
    else if (s.nextReview <= now)  due.push(c)
    // cards scheduled for the future are excluded
  }

  due.sort((a, b) => (progress[a.id]?.nextReview ?? 0) - (progress[b.id]?.nextReview ?? 0))

  // shuffle unseen
  for (let i = unseen.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[unseen[i], unseen[j]] = [unseen[j], unseen[i]]
  }

  return [...due, ...unseen]
}

function getCards(chapter: string) {
  return chapter === 'all' ? FLASHCARDS : FLASHCARDS.filter(c => c.chapter === chapter)
}

// Earliest future due time
function nextDueTs(progress: ProgressMap, chapter: string): number | null {
  const now = Date.now()
  let earliest: number | null = null
  for (const c of getCards(chapter)) {
    const s = progress[c.id]
    if (!s || s.nextReview <= now) continue
    if (earliest === null || s.nextReview < earliest) earliest = s.nextReview
  }
  return earliest
}

// ── Bucket dots ────────────────────────────────────────────────
function BucketBar({ bucket }: { bucket: number }) {
  const pct = Math.min(bucket / MAX_BUCKET, 1)
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
  const [chapter, setChapter] = useState('all')
  const [progress, setProgress] = useState<ProgressMap>(loadProgress)
  const [revealed, setRevealed] = useState(false)
  const [graduated, setGraduated] = useState(0)
  const [notesOpen, setNotesOpen] = useState(false)

  const cards = useMemo(() => getCards(chapter), [chapter])
  const queue  = useMemo(() => computeQueue(cards, progress), [cards, progress])

  const card   = queue[0]
  const bucket = card ? (progress[card.id]?.bucket ?? 0) : 0

  function changeChapter(ch: string) {
    setChapter(ch)
    setRevealed(false)
    setGraduated(0)
  }

  function rate(rating: Rating) {
    if (!card) return
    let newBucket: number
    switch (rating) {
      case 'green':  newBucket = Math.min(MAX_BUCKET, bucket + 1); break
      case 'yellow': newBucket = bucket; break
      case 'red':    newBucket = Math.max(0, bucket - 1); break
      case 'black':  newBucket = 0; break
    }
    const newProgress: ProgressMap = {
      ...progress,
      [card.id]: { bucket: newBucket, nextReview: Date.now() + bucketIntervalMs(newBucket) },
    }
    setProgress(newProgress)
    saveProgress(newProgress)
    // Any rating schedules the card for the future, so it leaves the queue
    setGraduated(g => g + 1)
    setRevealed(false)
    setNotesOpen(false)
  }

  function resetProgress() {
    const cleared: ProgressMap = {}
    setProgress(cleared)
    saveProgress(cleared)
    setRevealed(false)
    setGraduated(0)
  }

  // Progress bar: graduated / (graduated + remaining due+unseen)
  const totalSession = graduated + queue.length
  const progressPct  = totalSession > 0 ? (graduated / totalSession) * 100 : 0

  // ── Empty queue ──────────────────────────────────────────────
  if (queue.length === 0) {
    const next   = nextDueTs(progress, chapter)
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
          <button className="header-toast-item" onClick={() => { close(); resetProgress() }}>Reset all progress</button>
        </>)} />
      </header>

      {/* Chapter filter */}
      <div className="fq-topics">
        <button
          className={`fq-pill${chapter === 'all' ? ' fq-pill-active' : ''}`}
          onClick={() => changeChapter('all')}
        >
          All ({FLASHCARDS.length})
        </button>
        {CHAPTERS.map(ch => (
          <button
            key={ch}
            className={`fq-pill${chapter === ch ? ' fq-pill-active' : ''}`}
            onClick={() => changeChapter(ch)}
          >
            {CHAPTER_NAMES[ch]} ({getCards(ch).length})
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
          onClick={() => !revealed && setRevealed(true)}
          role="button"
          aria-label="Reveal answer"
        >
          {/* Question face */}
          <div className={`fq-face ${revealed ? 'fq-face-hidden' : 'fq-face-visible'}`}>
            <span className="fq-topic-badge">{card.topic}</span>
            <p className="fq-q-text">{card.q}</p>
            <div className="fq-front-footer">
              <BucketBar bucket={bucket} />
              <span className="fq-flip-hint">tap to reveal</span>
            </div>
          </div>

          {/* Answer face */}
          <div className={`fq-face ${revealed ? 'fq-face-visible' : 'fq-face-hidden'}`}>
            <span className="fq-answer-label">Answer</span>
            <p className="fq-a-text">{card.a}</p>
          </div>
        </div>

        {/* Notes toggle */}
        {revealed && (
          <button
            className="fq-notes-toggle"
            onClick={() => setNotesOpen(o => !o)}
          >
            {notesOpen ? '▲ Hide notes' : '▼ See notes'}
          </button>
        )}

        {/* Notes excerpt (topic label links conceptually to notes) */}
        {revealed && notesOpen && (
          <div className="fq-notes-panel">
            <div className="fq-notes-header">
              From notes · {card.topic}
            </div>
            <p className="fq-notes-text">
              Your full notes are at <code>/root/cpp-notes.md</code>.
              Topic: <strong>{card.topic}</strong> — search for it there for the full context and diagrams.
            </p>
          </div>
        )}

        {/* Rating buttons */}
        <div className="fq-ratings">
          <button className="fq-rate-btn fq-rate-black" onClick={() => rate('black')} disabled={!revealed} title="Reset to bucket 0">
            Reset
          </button>
          <button className="fq-rate-btn fq-rate-red" onClick={() => rate('red')} disabled={!revealed} title="Drop one bucket">
            Hard
          </button>
          <button className="fq-rate-btn fq-rate-yellow" onClick={() => rate('yellow')} disabled={!revealed} title="Stay in same bucket">
            Okay
          </button>
          <button className="fq-rate-btn fq-rate-green" onClick={() => rate('green')} disabled={!revealed} title="Move up one bucket">
            Easy
          </button>
        </div>
      </div>
    </div>
  )
}
