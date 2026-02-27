import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import './App.css'

// ── App registry ────────────────────────────────────────────
const APP_LIST = [
  { name: 'Pomodoro', path: '/pomodoro', icon: '🍅', gradient: 'linear-gradient(145deg, #e8705a, #b84030)' },
  { name: 'Notes',    path: '/notes',    icon: '📋', gradient: 'linear-gradient(145deg, #c9a84c, #8a6220)' },
]

// ── Shared page shell ────────────────────────────────────────
function AppPage({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ‹ Home
        </button>
        <span className="page-header-title">{title}</span>
      </header>
      <div className="page-body">{children}</div>
    </div>
  )
}

// ── Home ─────────────────────────────────────────────────────
function Home() {
  return (
    <div className="home">
      <p className="home-title">Apps</p>
      <div className="app-grid">
        {APP_LIST.map(app => (
          <Link key={app.path} to={app.path} className="app-tile">
            <div className="app-icon" style={{ background: app.gradient }}>
              {app.icon}
            </div>
            <span className="app-label">{app.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Pomodoro ─────────────────────────────────────────────────
const MODES = { focus: 25 * 60, break: 5 * 60 }

function Pomodoro() {
  const [mode, setMode]       = useState<'focus' | 'break'>('focus')
  const [seconds, setSeconds] = useState(MODES.focus)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            if (mode === 'focus') {
              setSessions(n => n + 1)
              setMode('break')
              setSeconds(MODES.break)
            } else {
              setMode('focus')
              setSeconds(MODES.focus)
            }
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current!)
  }, [running, mode])

  const total    = MODES[mode]
  const progress = 1 - seconds / total
  const r        = 88
  const circ     = 2 * Math.PI * r
  const offset   = circ * (1 - progress)

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  const reset = () => {
    clearInterval(intervalRef.current!)
    setRunning(false)
    setSeconds(MODES[mode])
  }

  const strokeColor = mode === 'focus' ? '#e8705a' : '#5a9e6a'

  return (
    <AppPage title="Pomodoro">
      <div className="card">
        <div className="pomodoro-ring-wrap">
          <div className="pomodoro-ring">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle className="ring-track"    cx="100" cy="100" r={r} />
              <circle
                className="ring-progress"
                cx="100" cy="100" r={r}
                stroke={strokeColor}
                strokeDasharray={circ}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="ring-text">
              <span className="ring-time">{mm}:{ss}</span>
              <span className="ring-mode">{mode === 'focus' ? 'Focus' : 'Break'}</span>
            </div>
          </div>
        </div>

        <div className="pomo-controls">
          <button className="btn" onClick={reset}>Reset</button>
          <button className="btn btn-primary" onClick={() => setRunning(r => !r)}>
            {running ? 'Pause' : 'Start'}
          </button>
          <button className="btn" onClick={() => {
            clearInterval(intervalRef.current!)
            setRunning(false)
            const next = mode === 'focus' ? 'break' : 'focus'
            setMode(next)
            setSeconds(MODES[next])
          }}>
            Skip
          </button>
        </div>

        <p className="pomo-sessions">
          {sessions === 0 ? 'No sessions completed yet' : `${sessions} session${sessions !== 1 ? 's' : ''} completed`}
        </p>
      </div>
    </AppPage>
  )
}

// ── Notes ─────────────────────────────────────────────────────
interface Note { id: number; text: string; time: string }

function Notes() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try { return JSON.parse(localStorage.getItem('notes') ?? '[]') } catch { return [] }
  })
  const [input, setInput] = useState('')

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes))
  }, [notes])

  const add = () => {
    const text = input.trim()
    if (!text) return
    const now = new Date()
    setNotes(prev => [{ id: Date.now(), text, time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev])
    setInput('')
  }

  return (
    <AppPage title="Notes">
      <div className="notes-input-row">
        <input
          className="notes-input"
          placeholder="New note…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button className="btn btn-primary" onClick={add}>Add</button>
      </div>

      {notes.length === 0 ? (
        <p className="notes-empty">No notes yet. Add one above.</p>
      ) : (
        <div className="notes-list">
          {notes.map(note => (
            <div key={note.id} className="note-item">
              <span className="note-text">{note.text}</span>
              <span className="note-time">{note.time}</span>
              <button className="note-del" onClick={() => setNotes(prev => prev.filter(n => n.id !== note.id))}>×</button>
            </div>
          ))}
        </div>
      )}
    </AppPage>
  )
}

// ── Router ───────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/pomodoro"  element={<Pomodoro />} />
        <Route path="/notes"     element={<Notes />} />
      </Routes>
    </BrowserRouter>
  )
}
