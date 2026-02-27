import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import './App.css'
import RainfallDistribution from './RainfallDistribution'

// ── Theme ────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  return { theme, toggle }
}

// ── App registry ────────────────────────────────────────────
const APP_LIST = [
  { name: 'Timer',    path: '/timer',    icon: '⏱', gradient: 'linear-gradient(145deg, #2a6898, #1a3a5a)' },
  { name: 'Notes',    path: '/notes',    icon: '📋', gradient: 'linear-gradient(145deg, #2a7855, #1a4a32)' },
  { name: 'Rainfall', path: '/rainfall', icon: '🌧', gradient: 'linear-gradient(145deg, #3a6888, #7eb8d4)' },
]

// ── Theme toggle button ──────────────────────────────────────
function ThemeToggle({ theme, toggle }: { theme: 'dark' | 'light'; toggle: () => void }) {
  return (
    <button className="theme-toggle" onClick={toggle}>
      {theme === 'dark' ? '☀ light' : '◑ dark'}
    </button>
  )
}

// ── Shared page shell ────────────────────────────────────────
function AppPage({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            ‹ Home
          </button>
          <span className="page-header-title">{title}</span>
        </div>
        <ThemeToggle theme={theme} toggle={toggle} />
      </header>
      <div className="page-body">{children}</div>
    </div>
  )
}

// ── Home ─────────────────────────────────────────────────────
function Home() {
  const { theme, toggle } = useTheme()
  return (
    <div className="home">
      <div className="home-header">
        <ThemeToggle theme={theme} toggle={toggle} />
      </div>
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

// ── Wheel picker ──────────────────────────────────────────────
const ITEM_H  = 44
const WHEEL_H = ITEM_H * 5
const PAD     = (WHEEL_H - ITEM_H) / 2

const H_ITEMS = Array.from({ length: 24 }, (_, i) => i)
const M_ITEMS = Array.from({ length: 60 }, (_, i) => i)
const S_ITEMS = Array.from({ length: 60 }, (_, i) => i)

function Wheel({ items, value, onChange, label }: {
  items: number[]
  value: number
  onChange: (v: number) => void
  label: string
}) {
  const ref  = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const tid  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = value * ITEM_H
  }, [])

  useEffect(() => {
    if (ref.current && !busy.current)
      ref.current.scrollTop = value * ITEM_H
  }, [value])

  const onScroll = () => {
    busy.current = true
    if (tid.current) clearTimeout(tid.current)
    if (ref.current) {
      const idx = Math.round(ref.current.scrollTop / ITEM_H)
      onChange(items[Math.max(0, Math.min(idx, items.length - 1))])
    }
    tid.current = setTimeout(() => { busy.current = false }, 200)
  }

  return (
    <div className="wheel-col">
      <div className="wheel-outer">
        <div className="wheel-scroller" ref={ref} onScroll={onScroll}>
          <div style={{ height: PAD }} />
          {items.map(n => (
            <div key={n} className="wheel-item">
              {String(n).padStart(2, '0')}
            </div>
          ))}
          <div style={{ height: PAD }} />
        </div>
        <div className="wheel-fade" />
        <div className="wheel-selector" />
      </div>
      <span className="wheel-label">{label}</span>
    </div>
  )
}

// ── Timer ─────────────────────────────────────────────────────
function Timer() {
  const [hrs,  setHrs]  = useState(0)
  const [mins, setMins] = useState(5)
  const [secs, setSecs] = useState(0)

  const [started,   setStarted]   = useState(false)
  const [running,   setRunning]   = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [total,     setTotal]     = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(intervalRef.current!); setRunning(false); return 0 }
          return r - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current!)
  }, [running])

  const start = () => {
    const t = hrs * 3600 + mins * 60 + secs
    if (t === 0) return
    setTotal(t)
    setRemaining(t)
    setStarted(true)
    setRunning(true)
  }

  const reset = () => {
    clearInterval(intervalRef.current!)
    setRunning(false)
    setStarted(false)
    setRemaining(0)
  }

  const done     = started && remaining === 0
  const fraction = total > 0 ? remaining / total : 1
  const r        = 88
  const circ     = 2 * Math.PI * r
  const offset   = circ * (1 - fraction)

  const rh = Math.floor(remaining / 3600)
  const rm = Math.floor((remaining % 3600) / 60)
  const rs = remaining % 60
  const timeStr = rh > 0
    ? `${rh}:${String(rm).padStart(2,'0')}:${String(rs).padStart(2,'0')}`
    : `${rm}:${String(rs).padStart(2,'0')}`

  return (
    <AppPage title="Timer">
      <div className="card">
        {!started ? (
          <>
            <div className="wheels-row">
              <Wheel items={H_ITEMS} value={hrs}  onChange={setHrs}  label="hours" />
              <Wheel items={M_ITEMS} value={mins} onChange={setMins} label="min" />
              <Wheel items={S_ITEMS} value={secs} onChange={setSecs} label="sec" />
            </div>
            <div className="timer-controls">
              <button
                className="btn btn-primary"
                onClick={start}
                disabled={hrs + mins + secs === 0}
              >
                Start
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="timer-ring-wrap">
              <div className="timer-ring">
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <circle className="ring-track" cx="100" cy="100" r={r} />
                  <circle
                    className="ring-progress"
                    cx="100" cy="100" r={r}
                    stroke={done ? '#5a9e6a' : 'var(--accent)'}
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                  />
                </svg>
                <div className="ring-text">
                  <span className="ring-time">{timeStr}</span>
                  {done && <span className="ring-done">done</span>}
                </div>
              </div>
            </div>
            <div className="timer-controls">
              <button className="btn" onClick={reset}>Reset</button>
              {!done && (
                <button className="btn btn-primary" onClick={() => setRunning(r => !r)}>
                  {running ? 'Pause' : 'Resume'}
                </button>
              )}
            </div>
          </>
        )}
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
  // Apply saved theme on initial load
  useEffect(() => {
    const saved = localStorage.getItem('theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : '')
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/timer"     element={<Timer />} />
        <Route path="/notes"     element={<Notes />} />
        <Route path="/rainfall"  element={<RainfallDistribution />} />
      </Routes>
    </BrowserRouter>
  )
}
