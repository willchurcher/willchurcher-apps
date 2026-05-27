import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeaderRight } from './HeaderRight'
import BodyMap from './BodyMap'

// ── Types ──────────────────────────────────────────────────────

type Score = 1 | 2 | 3 | 4 | 5

interface TestScore {
  testId: string
  date: string
  rawValue?: number
  score: Score
  side?: 'left' | 'right'
  notes: string
}

interface SetEntry {
  id: string
  exerciseId: string
  weight: number
  reps: number
  done: boolean
}

interface Session {
  id: string
  date: string
  notes: string
  sets: SetEntry[]
}

// ── Muscle groups & diagnostic tests ──────────────────────────

interface TestDef {
  id: string
  name: string
  unit: 'seconds' | 'cm' | 'reps' | 'degrees' | 'feel'
  bilateral?: boolean
  benchmarks: [number, number, number, number] // thresholds for scores 2,3,4,5
  description: string
}

interface MuscleGroup {
  id: string
  name: string
  tests: TestDef[]
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  {
    id: 'hamstrings', name: 'Hamstrings',
    tests: [
      { id: 'pike-sit', name: 'Pike sit against wall', unit: 'feel', description: 'Legs straight, feet vertical, back flat to wall', benchmarks: [2, 3, 4, 5] },
      { id: 'active-slr', name: 'Active straight leg raise', unit: 'degrees', description: 'Raise straight leg as high as possible while lying flat', benchmarks: [45, 60, 70, 80] },
    ],
  },
  {
    id: 'adductors', name: 'Adductors',
    tests: [
      { id: 'copenhagen-plank', name: 'Copenhagen plank hold', unit: 'seconds', bilateral: true, description: 'Top leg on bench, hold side plank with adductor', benchmarks: [10, 20, 30, 45] },
      { id: 'cossack-squat', name: 'Cossack squat depth', unit: 'feel', description: 'Lateral squat to full depth, other leg straight', benchmarks: [2, 3, 4, 5] },
    ],
  },
  {
    id: 'glute-med', name: 'Glute med',
    tests: [
      { id: 'single-leg-rdl', name: 'Single-leg RDL control', unit: 'feel', description: '10 controlled reps each side without hip drop', benchmarks: [2, 3, 4, 5] },
    ],
  },
  {
    id: 'ankles', name: 'Ankles',
    tests: [
      { id: 'knee-to-wall', name: 'Knee-to-wall', unit: 'cm', bilateral: true, description: 'Foot distance from wall when knee just touches it', benchmarks: [4, 8, 10, 12] },
      { id: 'deep-squat-hold', name: 'Deep squat hold (heels flat)', unit: 'seconds', description: 'Hold deep squat with heels on floor, upright torso', benchmarks: [0, 15, 30, 60] },
    ],
  },
  {
    id: 'knees', name: 'Knees',
    tests: [
      { id: 'atg-split-squat', name: 'ATG split squat', unit: 'feel', description: 'Back knee to floor, front knee past toes, no pain', benchmarks: [2, 3, 4, 5] },
      { id: 'knee-feel', name: 'Knee joint feel', unit: 'feel', description: 'Clicking, swelling, or pain in the joint', benchmarks: [2, 3, 4, 5] },
    ],
  },
  {
    id: 'hip-flexors', name: 'Hip flexors',
    tests: [
      { id: 'couch-stretch', name: 'Couch stretch', unit: 'feel', description: 'Back foot up, lunge — hips square, torso upright', benchmarks: [2, 3, 4, 5] },
    ],
  },
  {
    id: 'shoulders', name: 'Shoulders',
    tests: [
      { id: 'dead-hang', name: 'Dead hang', unit: 'seconds', description: 'Hang from bar until grip fails', benchmarks: [10, 30, 60, 90] },
      { id: 'pull-ups', name: 'Pull-ups (strict)', unit: 'reps', description: 'Dead hang to chin over bar, no kipping', benchmarks: [0, 2, 5, 10] },
      { id: 'shoulder-feel', name: 'Shoulder joint feel', unit: 'feel', description: 'Clicking, grinding, or pain in the joint', benchmarks: [2, 3, 4, 5] },
    ],
  },
  {
    id: 'core', name: 'Core',
    tests: [
      { id: 'hollow-hold', name: 'Hollow hold', unit: 'seconds', description: 'Arms overhead, lower back pressed flat', benchmarks: [15, 30, 45, 60] },
      { id: 'hanging-leg-raise', name: 'Hanging leg raise (straight)', unit: 'reps', description: 'Straight legs to bar, controlled', benchmarks: [2, 5, 8, 12] },
    ],
  },
  {
    id: 'posterior', name: 'Posterior chain',
    tests: [
      { id: 'jefferson-curl-feel', name: 'Jefferson curl feel', unit: 'feel', description: 'Slow segmental roll-down with light DB', benchmarks: [2, 3, 4, 5] },
      { id: 'lower-back-feel', name: 'Lower back feel', unit: 'feel', description: 'Stiffness, ache, or weird sensations', benchmarks: [2, 3, 4, 5] },
    ],
  },
  {
    id: 'calves', name: 'Calves',
    tests: [
      { id: 'single-leg-calf-raise', name: 'Single-leg calf raise', unit: 'reps', bilateral: true, description: 'Full ROM off step edge, pause at bottom', benchmarks: [10, 15, 20, 25] },
    ],
  },
]

// ── Exercises ──────────────────────────────────────────────────

interface ExerciseDef { id: string; name: string; category: string }

const EXERCISES: ExerciseDef[] = [
  { id: 'back-squat', name: 'Back squat', category: 'Strength' },
  { id: 'deadlift', name: 'Deadlift', category: 'Strength' },
  { id: 'hip-thrust', name: 'Hip thrust', category: 'Strength' },
  { id: 'bench-press', name: 'Bench press', category: 'Strength' },
  { id: 'ohp', name: 'Overhead press', category: 'Strength' },
  { id: 'pull-up', name: 'Pull-up', category: 'Strength' },
  { id: 'barbell-row', name: 'Barbell row', category: 'Strength' },
  { id: 'pendulum-squat', name: 'Pendulum squat', category: 'Lower — Quad' },
  { id: 'atg-split-squat-ex', name: 'ATG split squat', category: 'Lower — Quad' },
  { id: 'walking-lunge', name: 'Walking lunge', category: 'Lower — Quad' },
  { id: 'step-up', name: 'Step-up', category: 'Lower — Quad' },
  { id: 'rdl', name: 'Romanian deadlift', category: 'Lower — Posterior' },
  { id: 'seated-leg-curl', name: 'Seated leg curl', category: 'Lower — Posterior' },
  { id: 'nordic-curl', name: 'Nordic curl', category: 'Lower — Posterior' },
  { id: 'jefferson-curl-ex', name: 'Jefferson curl', category: 'Lower — Posterior' },
  { id: 'good-morning', name: 'Good morning', category: 'Lower — Posterior' },
  { id: 'b-stance-hip-thrust', name: 'B-stance hip thrust', category: 'Lower — Glute' },
  { id: 'cossack-squat-ex', name: 'Cossack squat', category: 'Lower — Glute' },
  { id: 'copenhagen-plank-ex', name: 'Copenhagen plank', category: 'Lower — Adductor' },
  { id: 'adductor-machine', name: 'Adductor machine', category: 'Lower — Adductor' },
  { id: 'side-lunge', name: 'Side lunge', category: 'Lower — Adductor' },
  { id: 'standing-calf-raise', name: 'Standing calf raise', category: 'Lower — Calf' },
  { id: 'seated-calf-raise', name: 'Seated calf raise', category: 'Lower — Calf' },
  { id: 'tibialis-raise', name: 'Tibialis raise', category: 'Lower — Calf' },
  { id: 'incline-db-press', name: 'Incline DB press', category: 'Upper — Push' },
  { id: 'weighted-dip', name: 'Weighted dip', category: 'Upper — Push' },
  { id: 'lateral-raise', name: 'Lateral raise', category: 'Upper — Push' },
  { id: 'triceps-extension', name: 'Triceps extension', category: 'Upper — Push' },
  { id: 'face-pull', name: 'Face pull', category: 'Upper — Pull' },
  { id: 'lat-pulldown', name: 'Lat pulldown', category: 'Upper — Pull' },
  { id: 'chest-supported-row', name: 'Chest-supported row', category: 'Upper — Pull' },
  { id: 'bicep-curl', name: 'Bicep curl', category: 'Upper — Pull' },
  { id: 'hammer-curl', name: 'Hammer curl', category: 'Upper — Pull' },
  { id: 'rear-delt-fly', name: 'Rear delt fly', category: 'Upper — Pull' },
  { id: 'dead-hang-ex', name: 'Dead hang', category: 'Prehab' },
  { id: 'scap-pull-up', name: 'Scapular pull-up', category: 'Prehab' },
  { id: 'backward-walk', name: 'Backward treadmill walk', category: 'Prehab' },
]

// ── Helpers ────────────────────────────────────────────────────

function rawToScore(value: number, benchmarks: [number, number, number, number]): Score {
  if (value < benchmarks[0]) return 1
  if (value < benchmarks[1]) return 2
  if (value < benchmarks[2]) return 3
  if (value < benchmarks[3]) return 4
  return 5
}

function scoreColor(s: number) {
  if (s >= 4.5) return '#4ade80'
  if (s >= 3.5) return '#86efac'
  if (s >= 2.5) return 'var(--accent)'
  if (s >= 1.5) return '#facc15'
  return '#f87171'
}

const FEEL_DESC: Record<Score, string> = {
  1: 'Pain / can\'t do',
  2: 'Very restricted / clicking + ache',
  3: 'Okay — some restriction',
  4: 'Good — minor tightness',
  5: 'Perfect — no issues',
}

// ── LocalStorage ───────────────────────────────────────────────

const SCORES_KEY = 'gym-tracker:test-scores'
const SESSIONS_KEY = 'gym-tracker:sessions'
const ACTIVE_KEY = 'gym-tracker:active-session'

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
function save(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)) }

// ── Radar chart ────────────────────────────────────────────────

function RadarChart({ groupScores }: { groupScores: Record<string, number> }) {
  const N = MUSCLE_GROUPS.length
  const cx = 140, cy = 140, R = 100

  const pt = (i: number, level: number) => {
    const angle = -Math.PI / 2 + (2 * Math.PI / N) * i
    const r = (level / 5) * R
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number]
  }

  const scorePoints = MUSCLE_GROUPS.map((g, i) => {
    const s = Math.max(1, groupScores[g.id] || 1)
    const angle = -Math.PI / 2 + (2 * Math.PI / N) * i
    const r = ((s - 1) / 4) * R
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  })

  const poly = (pts: number[][] | [number, number][]) => pts.map(p => p.join(',')).join(' ')

  return (
    <svg width={280} height={280} viewBox="0 0 280 280" style={{ display: 'block', margin: '0 auto' }}>
      {[1, 2, 3, 4, 5].map(lvl => (
        <polygon key={lvl} points={poly(MUSCLE_GROUPS.map((_, i) => pt(i, lvl)))}
          fill="none" stroke="var(--border-hi)" strokeWidth={lvl === 5 ? 1.5 : 0.75} />
      ))}
      {MUSCLE_GROUPS.map((_, i) => {
        const [x, y] = pt(i, 5)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={0.75} />
      })}
      <polygon points={poly(scorePoints)} fill="var(--accent)" fillOpacity={0.18}
        stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
      {scorePoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill="var(--accent)" />
      ))}
      {MUSCLE_GROUPS.map((g, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI / N) * i
        const lx = cx + (R + 24) * Math.cos(angle)
        const ly = cy + (R + 24) * Math.sin(angle)
        const anchor = Math.cos(angle) > 0.1 ? 'start' : Math.cos(angle) < -0.1 ? 'end' : 'middle'
        return (
          <text key={g.id} x={lx} y={ly + 4} textAnchor={anchor}
            fontSize={8.5} fill="var(--text2)" fontFamily="var(--font-mono)">
            {g.name.toUpperCase()}
          </text>
        )
      })}
    </svg>
  )
}

// ── Log score sheet ────────────────────────────────────────────

function LogScoreSheet({ test, side, onSave, onClose }: {
  test: TestDef; side?: 'left' | 'right'
  onSave: (s: TestScore) => void; onClose: () => void
}) {
  const [rawValue, setRawValue] = useState('')
  const [feelScore, setFeelScore] = useState<Score | null>(null)
  const [notes, setNotes] = useState('')

  const isFeelTest = test.unit === 'feel'
  const autoScore = !isFeelTest && rawValue ? rawToScore(parseFloat(rawValue), test.benchmarks) : null
  const computedScore = isFeelTest ? feelScore : autoScore

  const placeholder = test.unit === 'seconds' ? '45' : test.unit === 'cm' ? '10' : test.unit === 'degrees' ? '70' : '12'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--bg2)', borderRadius: '16px 16px 0 0', padding: '1.25rem 1.25rem 2.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
              {test.name}{side ? ` — ${side}` : ''}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text2)', marginTop: '0.2rem' }}>{test.description}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-hi)', fontSize: '1.2rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>✕</button>
        </div>

        {!isFeelTest && (
          <div style={{ margin: '1rem 0' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block', marginBottom: '0.4rem' }}>
              Enter value ({test.unit})
            </label>
            <input
              type="number" inputMode="decimal" autoFocus
              value={rawValue} onChange={e => setRawValue(e.target.value)}
              placeholder={`e.g. ${placeholder}`}
              style={{ width: '100%', padding: '0.7rem 0.85rem', fontSize: '1.1rem', background: 'var(--surface)', border: '1px solid var(--border-hi)', borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
            />
            {autoScore && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: scoreColor(autoScore) }}>
                → Score: {autoScore}/5
              </div>
            )}
          </div>
        )}

        {isFeelTest && (
          <div style={{ margin: '1rem 0' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block', marginBottom: '0.5rem' }}>How did it feel?</label>
            {([1, 2, 3, 4, 5] as Score[]).map(s => (
              <button key={s} onClick={() => setFeelScore(s)} style={{
                width: '100%', marginBottom: '0.4rem', padding: '0.6rem 0.75rem', textAlign: 'left',
                fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                display: 'flex', gap: '0.6rem', alignItems: 'center', borderRadius: 8,
                background: feelScore === s ? 'var(--accent)' : 'var(--surface)',
                color: feelScore === s ? 'var(--accent-fg)' : 'var(--text)',
                border: `1px solid ${feelScore === s ? 'var(--accent)' : 'var(--border)'}`,
              }}>
                <span style={{ fontWeight: 700, minWidth: 14 }}>{s}</span>
                <span style={{ color: feelScore === s ? 'var(--accent-fg)' : 'var(--text2)' }}>{FEEL_DESC[s]}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block', marginBottom: '0.4rem' }}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="e.g. left side noticeably tighter"
            style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.9rem', background: 'var(--surface)', border: '1px solid var(--border-hi)', borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-mono)', resize: 'none' }}
          />
        </div>

        <button onClick={() => computedScore && onSave({
          testId: test.id, date: new Date().toISOString().split('T')[0],
          rawValue: rawValue ? parseFloat(rawValue) : undefined,
          score: computedScore, side, notes,
        })} disabled={!computedScore} style={{
          width: '100%', padding: '0.85rem',
          background: computedScore ? 'var(--accent)' : 'var(--surface)',
          color: computedScore ? 'var(--accent-fg)' : 'var(--muted-hi)',
          border: 'none', borderRadius: 10, fontSize: '0.9rem', fontWeight: 700,
          cursor: computedScore ? 'pointer' : 'default', fontFamily: 'var(--font-mono)',
        }}>
          Save score
        </button>
      </div>
    </div>
  )
}

// ── Tests tab ──────────────────────────────────────────────────

function TestsTab({ scores, onLog }: { scores: TestScore[]; onLog: (s: TestScore) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [logging, setLogging] = useState<{ test: TestDef; side?: 'left' | 'right' } | null>(null)

  const latestScore = (testId: string, side?: string) => {
    const entries = scores.filter(s => s.testId === testId && (!side || s.side === side))
    return entries.length > 0 ? entries.reduce((a, b) => a.date > b.date ? a : b) : undefined
  }

  const groupScore = (g: MuscleGroup): number => {
    const vals: number[] = []
    for (const t of g.tests) {
      const sides = t.bilateral ? ['left', 'right'] : [undefined]
      for (const side of sides) {
        const e = latestScore(t.id, side)
        if (e) vals.push(e.score)
      }
    }
    return vals.length > 0 ? vals.reduce((a, b) => a + b) / vals.length : 0
  }

  const radarScores = Object.fromEntries(MUSCLE_GROUPS.map(g => [g.id, groupScore(g)]))

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: '1.5rem 1rem 0.75rem', textAlign: 'center' }}>
        <RadarChart groupScores={radarScores} />
        <p style={{ fontSize: '0.68rem', color: 'var(--text2)', marginTop: '0.35rem', letterSpacing: '0.04em' }}>
          TAP A GROUP TO LOG TESTS
        </p>
      </div>

      {MUSCLE_GROUPS.map(g => {
        const avg = groupScore(g)
        const isOpen = expanded === g.id
        return (
          <div key={g.id} style={{ margin: '0 1rem 0.65rem', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <button onClick={() => setExpanded(isOpen ? null : g.id)} style={{
              width: '100%', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontFamily: 'var(--font-mono)', textAlign: 'left',
            }}>
              <span style={{ flex: 1, fontSize: '0.85rem' }}>{g.name}</span>
              {avg > 0
                ? <span style={{ fontSize: '0.82rem', fontWeight: 700, color: scoreColor(avg) }}>{avg.toFixed(1)} / 5</span>
                : <span style={{ fontSize: '0.72rem', color: 'var(--muted-hi)' }}>not tested</span>}
              <span style={{ color: 'var(--muted-hi)', fontSize: '0.75rem' }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem' }}>
                {g.tests.map(t => {
                  const sides = t.bilateral ? ['left', 'right'] as const : [undefined]
                  return (
                    <div key={t.id} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text)', marginBottom: '0.15rem' }}>{t.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '0.45rem' }}>{t.description}</div>
                      {sides.map(side => {
                        const latest = latestScore(t.id, side)
                        return (
                          <div key={side ?? 'both'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            {side && <span style={{ fontSize: '0.68rem', color: 'var(--muted-hi)', width: 28, flexShrink: 0 }}>{side}</span>}
                            <span style={{ flex: 1, fontSize: '0.75rem', color: latest ? scoreColor(latest.score) : 'var(--muted-hi)' }}>
                              {latest
                                ? `${latest.score}/5${latest.rawValue !== undefined ? ` · ${latest.rawValue}${t.unit !== 'feel' ? ' ' + t.unit : ''}` : ''}`
                                : '—'}
                            </span>
                            <button onClick={() => setLogging({ test: t, side })} style={{
                              padding: '0.25rem 0.65rem', fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                              background: 'var(--surface2)', border: '1px solid var(--border-hi)',
                              borderRadius: 6, color: 'var(--accent)', cursor: 'pointer',
                            }}>Log</button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {logging && (
        <LogScoreSheet test={logging.test} side={logging.side}
          onSave={s => { onLog(s); setLogging(null) }}
          onClose={() => setLogging(null)} />
      )}
    </div>
  )
}

// ── Log tab ────────────────────────────────────────────────────

function LogTab({ sessions, onFinish }: { sessions: Session[]; onFinish: (s: Session) => void }) {
  const [active, setActive] = useState<Session | null>(() => load<Session | null>(ACTIVE_KEY, null))
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')

  const persist = (s: Session | null) => { setActive(s); save(ACTIVE_KEY, s) }

  const addExercise = (ex: ExerciseDef) => {
    if (!active) return
    const set: SetEntry = { id: Date.now().toString(), exerciseId: ex.id, weight: 0, reps: 0, done: false }
    persist({ ...active, sets: [...active.sets, set] })
    setShowPicker(false); setSearch('')
  }

  const updateSet = (setId: string, changes: Partial<SetEntry>) => {
    if (!active) return
    persist({ ...active, sets: active.sets.map(s => s.id === setId ? { ...s, ...changes } : s) })
  }

  const addSet = (exId: string) => {
    if (!active) return
    const prev = [...active.sets].reverse().find(s => s.exerciseId === exId)
    const newSet: SetEntry = { id: Date.now().toString(), exerciseId: exId, weight: prev?.weight ?? 0, reps: prev?.reps ?? 0, done: false }
    persist({ ...active, sets: [...active.sets, newSet] })
  }

  const prevSets = (exId: string) => {
    for (let i = sessions.length - 1; i >= 0; i--) {
      const s = sessions[i].sets.filter(s => s.exerciseId === exId && s.done)
      if (s.length > 0) return s
    }
    return []
  }

  const exIds = active ? [...new Set(active.sets.map(s => s.exerciseId))] : []

  const filtered = search
    ? EXERCISES.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : null
  const grouped = EXERCISES.reduce<Record<string, ExerciseDef[]>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = []
    acc[e.category].push(e); return acc
  }, {})

  if (!active) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
      <p style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>No active session</p>
      <button onClick={() => persist({ id: Date.now().toString(), date: new Date().toISOString(), notes: '', sets: [] })}
        style={{ padding: '0.85rem 2.5rem', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
        START WORKOUT
      </button>
    </div>
  )

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text2)' }}>
          {new Date(active.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
        </span>
        <button onClick={() => { onFinish(active); persist(null) }}
          style={{ padding: '0.4rem 1rem', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
          FINISH
        </button>
      </div>

      {exIds.map(exId => {
        const ex = EXERCISES.find(e => e.id === exId)
        const sets = active.sets.filter(s => s.exerciseId === exId)
        const prev = prevSets(exId)
        return (
          <div key={exId} style={{ margin: '0.75rem 1rem', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '0.65rem 0.9rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ flex: 1 }}>{ex?.name}</span>
              {prev.length > 0 && (
                <span style={{ fontSize: '0.68rem', color: 'var(--muted-hi)', fontWeight: 400 }}>
                  prev: {prev[0].weight}kg × {prev[0].reps}
                </span>
              )}
            </div>
            {sets.map((set, idx) => (
              <div key={set.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.9rem', borderBottom: '1px solid var(--border)', opacity: set.done ? 0.45 : 1 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted-hi)', width: 18, flexShrink: 0 }}>{idx + 1}</span>
                <input type="number" inputMode="decimal" value={set.weight || ''} onChange={e => updateSet(set.id, { weight: parseFloat(e.target.value) || 0 })} placeholder="kg"
                  style={{ width: 62, padding: '0.35rem 0.5rem', fontSize: '1rem', background: 'var(--surface2)', border: '1px solid var(--border-hi)', borderRadius: 6, color: 'var(--text)', fontFamily: 'var(--font-mono)', textAlign: 'center' }} />
                <span style={{ color: 'var(--muted-hi)', fontSize: '0.85rem' }}>×</span>
                <input type="number" inputMode="numeric" value={set.reps || ''} onChange={e => updateSet(set.id, { reps: parseInt(e.target.value) || 0 })} placeholder="reps"
                  style={{ width: 58, padding: '0.35rem 0.5rem', fontSize: '1rem', background: 'var(--surface2)', border: '1px solid var(--border-hi)', borderRadius: 6, color: 'var(--text)', fontFamily: 'var(--font-mono)', textAlign: 'center' }} />
                <button onClick={() => updateSet(set.id, { done: !set.done })} style={{
                  marginLeft: 'auto', width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${set.done ? 'var(--accent)' : 'var(--border-hi)'}`,
                  background: set.done ? 'var(--accent)' : 'transparent',
                  color: set.done ? 'var(--accent-fg)' : 'var(--muted-hi)', fontSize: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✓</button>
              </div>
            ))}
            <button onClick={() => addSet(exId)} style={{ width: '100%', padding: '0.5rem', fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
              + Add set
            </button>
          </div>
        )
      })}

      <button onClick={() => setShowPicker(true)} style={{
        display: 'block', margin: '0.5rem 1rem', width: 'calc(100% - 2rem)',
        padding: '0.75rem', background: 'var(--surface)', border: '1px dashed var(--border-hi)',
        borderRadius: 10, color: 'var(--accent)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-mono)',
      }}>
        + Add exercise
      </button>

      {showPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowPicker(false)} />
          <div style={{ position: 'relative', background: 'var(--bg2)', borderRadius: '16px 16px 0 0', padding: '1rem', maxHeight: '75vh', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises…"
              style={{ padding: '0.65rem 0.85rem', fontSize: '1rem', background: 'var(--surface)', border: '1px solid var(--border-hi)', borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-mono)' }} />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {(filtered ?? []).map(ex => (
                <button key={ex.id} onClick={() => addExercise(ex)} style={{ display: 'block', width: '100%', padding: '0.7rem 0.5rem', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                  {ex.name}
                </button>
              ))}
              {!filtered && Object.entries(grouped).map(([cat, exs]) => (
                <div key={cat}>
                  <div style={{ padding: '0.4rem 0.5rem', fontSize: '0.68rem', color: 'var(--muted-hi)', letterSpacing: '0.08em' }}>{cat.toUpperCase()}</div>
                  {exs.map(ex => (
                    <button key={ex.id} onClick={() => addExercise(ex)} style={{ display: 'block', width: '100%', padding: '0.7rem 0.85rem', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                      {ex.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── History tab ────────────────────────────────────────────────

function HistoryTab({ sessions }: { sessions: Session[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (sessions.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <p style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>No sessions logged yet</p>
    </div>
  )

  return (
    <div style={{ paddingBottom: 80 }}>
      {[...sessions].reverse().map(session => {
        const exIds = [...new Set(session.sets.map(s => s.exerciseId))]
        const vol = session.sets.filter(s => s.done).reduce((acc, s) => acc + s.weight * s.reps, 0)
        const isOpen = openId === session.id
        return (
          <div key={session.id} style={{ margin: '0.75rem 1rem', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <button onClick={() => setOpenId(isOpen ? null : session.id)} style={{
              width: '100%', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontFamily: 'var(--font-mono)', textAlign: 'left',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {new Date(session.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text2)', marginTop: '0.2rem' }}>
                  {exIds.length} exercise{exIds.length !== 1 ? 's' : ''}{vol > 0 ? ` · ${vol.toLocaleString()} kg vol` : ''}
                </div>
              </div>
              <span style={{ color: 'var(--muted-hi)', fontSize: '0.75rem' }}>{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1rem' }}>
                {exIds.map(exId => {
                  const ex = EXERCISES.find(e => e.id === exId)
                  const sets = session.sets.filter(s => s.exerciseId === exId && s.done)
                  return (
                    <div key={exId} style={{ marginBottom: '0.65rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>{ex?.name}</div>
                      {sets.map((s, i) => (
                        <div key={s.id} style={{ fontSize: '0.75rem', color: 'var(--text2)', paddingLeft: '0.5rem' }}>
                          Set {i + 1}: {s.weight}kg × {s.reps}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────

export default function GymTracker() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'log' | 'tests' | 'body' | 'history'>('body')
  const [scores, setScores] = useState<TestScore[]>(() => load<TestScore[]>(SCORES_KEY, []))
  const [sessions, setSessions] = useState<Session[]>(() => load<Session[]>(SESSIONS_KEY, []))

  const handleLogScore = (s: TestScore) => {
    const updated = [...scores, s]
    setScores(updated); save(SCORES_KEY, updated)
  }

  const handleFinish = (session: Session) => {
    const updated = [...sessions, session]
    setSessions(updated); save(SESSIONS_KEY, updated)
  }

  const TABS = [
    { id: 'log' as const,  label: 'LOG',    icon: '🏋' },
    { id: 'tests' as const, label: 'TESTS', icon: '◎' },
    { id: 'body' as const, label: 'BODY',   icon: '⬡' },
    { id: 'history' as const, label: 'HISTORY', icon: '📈' },
  ]

  return (
    <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">GYM</span>
        </div>
        <HeaderRight />
      </header>

      <div style={{ flex: 1, overflowY: tab === 'body' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {tab === 'log'     && <LogTab sessions={sessions} onFinish={handleFinish} />}
        {tab === 'tests'   && <TestsTab scores={scores} onLog={handleLogScore} />}
        {tab === 'body'    && <BodyMap />}
        {tab === 'history' && <HistoryTab sessions={sessions} />}
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', borderTop: '1px solid var(--border)',
        background: 'var(--bg2)', zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '0.65rem 0.25rem', border: 'none', background: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            color: tab === t.id ? 'var(--accent)' : 'var(--muted-hi)', fontFamily: 'var(--font-mono)',
          }}>
            <span style={{ fontSize: '1.1rem' }}>{t.icon}</span>
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.08em', fontWeight: tab === t.id ? 700 : 400 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
