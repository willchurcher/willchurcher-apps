import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeaderRight } from './HeaderRight'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Transcript {
  id: string
  text: string
  createdAt: string
}

interface Project {
  id: string
  transcriptId: string
  title: string
  description: string
  status: 'active' | 'done'
  createdAt: string
}

interface Task {
  id: string
  projectId: string
  parentId: string | null
  title: string
  description: string
  estimatedMins: number
  status: 'todo' | 'done'
  level: 'task' | 'microtask'
  order: number
  completedAt: string | null
}

interface PlannerStore {
  transcripts: Transcript[]
  projects: Project[]
  tasks: Task[]
}

interface ExtractedMicrotask {
  title: string
  description: string
  estimatedMins: number
}

interface ExtractedTask {
  title: string
  description: string
  estimatedMins: number
  microtasks: ExtractedMicrotask[]
}

interface ExtractedProject {
  title: string
  description: string
  tasks: ExtractedTask[]
}

// ── Storage ────────────────────────────────────────────────────────────────────

const EMPTY_STORE: PlannerStore = { transcripts: [], projects: [], tasks: [] }

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function now(): string {
  return new Date().toISOString()
}

// ── Claude API ─────────────────────────────────────────────────────────────────

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) throw new Error('API error')
  const data = await res.json() as { text: string }
  return data.text
}

function extractPrompt(transcript: string): string {
  return `You are a productivity assistant. The user has pasted a voice note transcript.

Extract all distinct projects, goals, or plans from the transcript. For each one:
1. Give it a clear title (5 words max)
2. Write a 1-2 sentence description of the goal
3. Break it into tasks of ~30 minutes each
4. Break each task into microtasks of ~5 minutes each
5. Estimate time in minutes for every task and microtask

Return ONLY a JSON array. No markdown, no explanation, no code fences — just raw JSON starting with [.

Schema:
[
  {
    "title": "string",
    "description": "string",
    "tasks": [
      {
        "title": "string",
        "description": "string",
        "estimatedMins": 30,
        "microtasks": [
          { "title": "string", "description": "string", "estimatedMins": 5 }
        ]
      }
    ]
  }
]

Transcript:
${transcript}`
}

function buildCopyPrompt(project: Project, tasks: Task[]): string {
  const topTasks = tasks
    .filter(t => t.projectId === project.id && t.level === 'task')
    .sort((a, b) => a.order - b.order)

  const lines: string[] = [
    `I'm working on a project and need your help executing it step by step.`,
    ``,
    `PROJECT: ${project.title}`,
    `GOAL: ${project.description}`,
    ``,
    `FULL PLAN:`,
  ]

  topTasks.forEach((task, i) => {
    const done = task.status === 'done' ? ' ✓' : ''
    lines.push(`${i + 1}. ${task.title} (~${task.estimatedMins} min)${done}`)
    const micro = tasks
      .filter(t => t.parentId === task.id)
      .sort((a, b) => a.order - b.order)
    micro.forEach((m, j) => {
      const mdone = m.status === 'done' ? ' ✓' : ''
      lines.push(`   ${i + 1}.${j + 1}. ${m.title} (~${m.estimatedMins} min)${mdone}`)
    })
  })

  const doneTasks = topTasks.filter(t => t.status === 'done')
  const todoTasks = topTasks.filter(t => t.status === 'todo')

  lines.push(``, `CURRENT STATUS:`)
  doneTasks.forEach(t => lines.push(`✓ ${t.title}`))
  todoTasks.forEach(t => lines.push(`○ ${t.title}`))

  lines.push(
    ``,
    `Please help me work through this project. Start by asking which task I want to tackle first, then guide me through the microsteps one at a time. Check in after each one. Be practical and hands-on.`
  )

  return lines.join('\n')
}

// ── Main Component ─────────────────────────────────────────────────────────────

type View = 'home' | 'parse' | { projectId: string }
type ParseState = 'idle' | 'loading' | 'review' | 'error'

export default function VoicePlanner() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [store, setStore] = useState<PlannerStore>(EMPTY_STORE)
  const [storeLoading, setStoreLoading] = useState(true)
  const [view, setView] = useState<View>('home')

  useEffect(() => {
    supabase.from('app_data').select('data').eq('app', 'planner').maybeSingle()
      .then(({ data }) => {
        if (data?.data) setStore(data.data as unknown as PlannerStore)
        setStoreLoading(false)
      })
  }, [])
  const [parseText, setParseText] = useState('')
  const [parseState, setParseState] = useState<ParseState>('idle')
  const [extracted, setExtracted] = useState<ExtractedProject[]>([])
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const updateStore = useCallback((updater: (s: PlannerStore) => PlannerStore) => {
    setStore(prev => {
      const next = updater(prev)
      supabase.from('app_data').upsert(
        { user_id: user!.id, app: 'planner', data: next },
        { onConflict: 'user_id,app' }
      )
      return next
    })
  }, [user])

  // ── Parse ──────────────────────────────────────────────────────────────────

  const handleParse = async () => {
    const text = parseText.trim()
    if (!text) return
    setParseState('loading')
    try {
      const raw = await callClaude(extractPrompt(text))
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const idx = cleaned.indexOf('[')
      const parsed: ExtractedProject[] = JSON.parse(cleaned.slice(idx))
      setExtracted(parsed)
      setParseState('review')
    } catch {
      setParseState('error')
    }
  }

  const handleConfirm = () => {
    const transcriptId = uid()
    const transcript: Transcript = { id: transcriptId, text: parseText, createdAt: now() }
    const projects: Project[] = []
    const tasks: Task[] = []

    extracted.forEach(ep => {
      const projectId = uid()
      projects.push({
        id: projectId,
        transcriptId,
        title: ep.title,
        description: ep.description,
        status: 'active',
        createdAt: now(),
      })
      ep.tasks.forEach((et, ti) => {
        const taskId = uid()
        tasks.push({
          id: taskId,
          projectId,
          parentId: null,
          title: et.title,
          description: et.description,
          estimatedMins: et.estimatedMins,
          status: 'todo',
          level: 'task',
          order: ti,
          completedAt: null,
        })
        et.microtasks.forEach((em, mi) => {
          tasks.push({
            id: uid(),
            projectId,
            parentId: taskId,
            title: em.title,
            description: em.description,
            estimatedMins: em.estimatedMins,
            status: 'todo',
            level: 'microtask',
            order: mi,
            completedAt: null,
          })
        })
      })
    })

    updateStore(s => ({
      transcripts: [...s.transcripts, transcript],
      projects: [...s.projects, ...projects],
      tasks: [...s.tasks, ...tasks],
    }))

    setParseText('')
    setParseState('idle')
    setExtracted([])
    setView('home')
  }

  // ── Task interactions ──────────────────────────────────────────────────────

  const toggleExpanded = (id: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleDone = (taskId: string) => {
    updateStore(s => ({
      ...s,
      tasks: s.tasks.map(t =>
        t.id === taskId
          ? { ...t, status: t.status === 'done' ? 'todo' : 'done', completedAt: t.status === 'done' ? null : now() }
          : t
      ),
    }))
  }

  const copyPrompt = (projectId: string) => {
    const project = store.projects.find(p => p.id === projectId)
    if (!project) return
    const prompt = buildCopyPrompt(project, store.tasks)
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Home ───────────────────────────────────────────────────────────────────

  if (storeLoading) return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">VOICE PLANNER</span>
        </div>
        <HeaderRight />
      </header>
      <div className="page-body">
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>Loading…</div>
      </div>
    </div>
  )

  if (view === 'home') {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-header-left">
            <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
            <span className="page-header-title">VOICE PLANNER</span>
          </div>
          <HeaderRight />
        </header>
        <div className="page-body">
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1rem' }}
            onClick={() => setView('parse')}
          >
            + New Transcript
          </button>

          {store.projects.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem 1rem' }}>
              No projects yet. Paste a voice note to get started.
            </div>
          ) : (
            store.projects.map(project => {
              const ptasks = store.tasks.filter(t => t.projectId === project.id && t.level === 'task')
              const done = ptasks.filter(t => t.status === 'done').length
              const total = ptasks.length
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              return (
                <div
                  key={project.id}
                  className="card"
                  style={{ marginBottom: '0.75rem', cursor: 'pointer' }}
                  onClick={() => setView({ projectId: project.id })}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{project.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                    {project.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {done}/{total}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // ── Parse ──────────────────────────────────────────────────────────────────

  if (view === 'parse') {
    const backToParse = () => { setParseState('idle') }
    const backToHome = () => { setParseState('idle'); setExtracted([]); setView('home') }

    return (
      <div className="page">
        <header className="page-header">
          <div className="page-header-left">
            <button className="back-btn" onClick={parseState === 'review' ? backToParse : backToHome}>
              ‹ {parseState === 'review' ? 'Edit' : 'Back'}
            </button>
            <span className="page-header-title">NEW TRANSCRIPT</span>
          </div>
          <HeaderRight />
        </header>
        <div className="page-body">

          {(parseState === 'idle' || parseState === 'error') && (
            <div className="card">
              {parseState === 'error' && (
                <div style={{ color: '#e07070', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  Something went wrong — check that ANTHROPIC_API_KEY is set in Vercel, then try again.
                </div>
              )}
              <textarea
                style={{
                  width: '100%',
                  minHeight: 220,
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '0.75rem',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
                placeholder="Paste your voice note transcript here…"
                value={parseText}
                onChange={e => setParseText(e.target.value)}
              />
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.75rem' }}
                onClick={handleParse}
                disabled={!parseText.trim()}
              >
                Parse with Claude
              </button>
            </div>
          )}

          {parseState === 'loading' && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
              Thinking…
            </div>
          )}

          {parseState === 'review' && (
            <>
              <div style={{ marginBottom: '0.75rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Found {extracted.length} project{extracted.length !== 1 ? 's' : ''}. Remove any you don't want, then save.
              </div>

              {extracted.map((ep, i) => {
                const totalMins = ep.tasks.reduce(
                  (s, t) => s + t.estimatedMins + t.microtasks.reduce((a, m) => a + m.estimatedMins, 0),
                  0
                )
                return (
                  <div key={i} className="card" style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{ep.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>{ep.description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {ep.tasks.length} tasks · ~{totalMins} min total
                        </div>
                      </div>
                      <button
                        onClick={() => setExtracted(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.3rem', cursor: 'pointer', padding: '0 0.25rem', flexShrink: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}

              {extracted.length > 0 ? (
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleConfirm}>
                  Save {extracted.length} project{extracted.length !== 1 ? 's' : ''}
                </button>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', padding: '1rem' }}>
                  All removed. Go back to edit the transcript.
                </div>
              )}
            </>
          )}

        </div>
      </div>
    )
  }

  // ── Project ────────────────────────────────────────────────────────────────

  const { projectId } = view as { projectId: string }
  const project = store.projects.find(p => p.id === projectId)
  if (!project) {
    setView('home')
    return null
  }

  const topTasks = store.tasks
    .filter(t => t.projectId === projectId && t.level === 'task')
    .sort((a, b) => a.order - b.order)

  const doneTasks = topTasks.filter(t => t.status === 'done').length
  const pct = topTasks.length > 0 ? Math.round((doneTasks / topTasks.length) * 100) : 0

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => setView('home')}>‹ Back</button>
          <span className="page-header-title">{project.title.toUpperCase()}</span>
        </div>
        <HeaderRight />
      </header>
      <div className="page-body">

        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            {project.description}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {doneTasks}/{topTasks.length} tasks
            </span>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => copyPrompt(projectId)}
          >
            {copied ? 'Copied!' : 'Copy Prompt'}
          </button>
        </div>

        {topTasks.map(task => {
          const microtasks = store.tasks
            .filter(t => t.parentId === task.id)
            .sort((a, b) => a.order - b.order)
          const expanded = expandedTasks.has(task.id)

          return (
            <div key={task.id} className="card" style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={task.status === 'done'}
                  onChange={() => toggleDone(task.id)}
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{
                      fontWeight: 500,
                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                      color: task.status === 'done' ? 'var(--muted)' : 'var(--text)',
                    }}>
                      {task.title}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {task.estimatedMins}m
                    </span>
                  </div>
                  {microtasks.length > 0 && (
                    <button
                      onClick={() => toggleExpanded(task.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, marginTop: '0.3rem' }}
                    >
                      {expanded ? '▲ hide steps' : `▼ ${microtasks.length} steps`}
                    </button>
                  )}
                </div>
              </div>

              {expanded && microtasks.length > 0 && (
                <div style={{ marginTop: '0.75rem', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border)' }}>
                  {microtasks.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={m.status === 'done'}
                        onChange={() => toggleDone(m.id)}
                        style={{ marginTop: 2, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{
                          fontSize: '0.85rem',
                          textDecoration: m.status === 'done' ? 'line-through' : 'none',
                          color: m.status === 'done' ? 'var(--muted)' : 'var(--text)',
                        }}>
                          {m.title}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {m.estimatedMins}m
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

      </div>
    </div>
  )
}
