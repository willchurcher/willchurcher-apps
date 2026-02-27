import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import './App.css'

// ── App registry ────────────────────────────────────────────
const APP_LIST = [
  { name: 'Timer', path: '/timer', icon: '⏱', gradient: 'linear-gradient(145deg, #e8705a, #b84030)' },
  { name: 'Notes', path: '/notes', icon: '📋', gradient: 'linear-gradient(145deg, #c9a84c, #8a6220)' },
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

// ── Timer ─────────────────────────────────────────────────────
const DEFAULT = 5 * 60

function Timer() {
  const [total,    setTotal]   = useState(DEFAULT)
  const [seconds,  setSeconds] = useState(DEFAULT)
  const [running,  setRunning] = useState(false)
  const [editing,  setEditing] = useState(false)
  const [editVal,  setEditVal] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) { clearInterval(intervalRef.current!); setRunning(false); return 0 }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current!)
  }, [running])

  const adjust = (mins: number) => {
    const next = Math.max(60, Math.min(99 * 60, total + mins * 60))
    setTotal(next)
    setSeconds(next)
  }

  const reset = () => {
    clearInterval(intervalRef.current!)
    setRunning(false)
    setSeconds(total)
  }

  const startEdit = () => {
    if (running) return
    setEditVal(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`)
    setEditing(true)
  }

  const commitEdit = () => {
    setEditing(false)
    const parts = editVal.split(':')
    const mins  = parseInt(parts[0]) || 0
    const secs  = parseInt(parts[1]) || 0
    const next  = Math.max(60, Math.min(99 * 60, mins * 60 + secs))
    setTotal(next)
    setSeconds(next)
  }

  const done   = seconds === 0
  const r      = 88
  const circ   = 2 * Math.PI * r
  const offset = circ * (seconds / total)
  const mm     = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss     = String(seconds % 60).padStart(2, '0')

  return (
    <AppPage title="Timer">
      <div className="card">
        <div className="timer-ring-wrap">
          <div className="timer-ring">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle className="ring-track" cx="100" cy="100" r={r} />
              <circle
                className="ring-progress"
                cx="100" cy="100" r={r}
                stroke={done ? '#5a9e6a' : '#e8705a'}
                strokeDasharray={circ}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="ring-text">
              {editing ? (
                <input
                  className="ring-time-input"
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => e.key === 'Enter' && commitEdit()}
                  autoFocus
                />
              ) : (
                <span
                  className={`ring-time${!running ? ' ring-time-editable' : ''}`}
                  onClick={startEdit}
                >
                  {mm}:{ss}
                </span>
              )}
            </div>
          </div>
        </div>

        {!running && !editing && (
          <div className="timer-adjust">
            <button className="btn" onClick={() => adjust(-5)}>−5m</button>
            <button className="btn" onClick={() => adjust(-1)}>−1m</button>
            <button className="btn" onClick={() => adjust(1)}>+1m</button>
            <button className="btn" onClick={() => adjust(5)}>+5m</button>
          </div>
        )}

        <div className="timer-controls">
          <button className="btn" onClick={reset}>Reset</button>
          <button className="btn btn-primary" onClick={() => { if (done) { setSeconds(total); setRunning(true) } else setRunning(r => !r) }}>
            {done ? 'Restart' : running ? 'Pause' : 'Start'}
          </button>
        </div>
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
        <Route path="/timer"     element={<Timer />} />
        <Route path="/notes"     element={<Notes />} />
      </Routes>
    </BrowserRouter>
  )
}
