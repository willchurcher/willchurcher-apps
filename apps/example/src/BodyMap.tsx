import { useState } from 'react'
import Model from 'react-body-highlighter'
import type { IMuscleStats, Muscle } from 'react-body-highlighter'
import { useTheme } from './ThemeContext'

// ── Zone data ──────────────────────────────────────────────────

interface ZoneData {
  id: string
  name: string
  muscles: string[]
  joints: string[]
  tendons: string[]
  strength: string[]
  mobility: string[]
}

const ZONE_DATA: Record<string, ZoneData> = {
  neck: {
    id: 'neck', name: 'Neck',
    muscles: ['Sternocleidomastoid', 'Scalenes', 'Upper trapezius', 'Levator scapulae'],
    joints: ['Cervical spine (C1–C7)', 'Atlanto-occipital joint'],
    tendons: ['Nuchal ligament'],
    strength: ['Dead hang', 'Neck flexion/extension (isometric)', 'Shrugs', 'Scapular pull-up'],
    mobility: ['Chin tucks', 'Cervical rotation stretches', 'Lateral neck stretch'],
  },
  chest: {
    id: 'chest', name: 'Chest',
    muscles: ['Pectoralis major', 'Pectoralis minor', 'Serratus anterior'],
    joints: ['Sternoclavicular joint', 'Costochondral joints'],
    tendons: ['Pectoralis tendon'],
    strength: ['Bench press', 'Incline DB press', 'Weighted dip', 'Push-up'],
    mobility: ['Doorway pec stretch', 'Foam roll thoracic', 'Chest opener on floor'],
  },
  shoulders: {
    id: 'shoulders', name: 'Shoulders',
    muscles: ['Anterior deltoid', 'Lateral deltoid', 'Posterior deltoid', 'Supraspinatus', 'Infraspinatus', 'Teres minor', 'Subscapularis'],
    joints: ['Glenohumeral joint', 'Acromioclavicular joint'],
    tendons: ['Supraspinatus tendon', 'Biceps tendon (long head)', 'Rotator cuff tendons'],
    strength: ['Overhead press', 'Lateral raise', 'Face pull', 'Prone Y-T-W raises'],
    mobility: ['Sleeper stretch', 'Cross-body stretch', 'Wall shoulder flexion'],
  },
  'upper-arms': {
    id: 'upper-arms', name: 'Upper Arms',
    muscles: ['Biceps brachii', 'Brachialis', 'Brachioradialis', 'Triceps brachii (all 3 heads)'],
    joints: ['Elbow joint (humeroulnar)', 'Humeroradial joint'],
    tendons: ['Biceps tendon (distal)', 'Triceps tendon'],
    strength: ['Pull-up', 'Bicep curl', 'Hammer curl', 'Triceps extension', 'Close-grip bench'],
    mobility: ['Overhead triceps stretch', 'Elbow extension stretch'],
  },
  forearms: {
    id: 'forearms', name: 'Forearms & Grip',
    muscles: ['Flexor carpi radialis', 'Flexor digitorum superficialis', 'Extensor carpi radialis', 'Pronator teres'],
    joints: ['Radiocarpal (wrist) joint', 'Distal radioulnar joint'],
    tendons: ['Finger flexor tendons', 'Extensor tendons'],
    strength: ['Dead hang', 'Farmer carry', 'Hammer curl', 'Wrist roller'],
    mobility: ['Wrist circles', 'Prayer stretch', 'Finger extension stretch'],
  },
  core: {
    id: 'core', name: 'Core & Abs',
    muscles: ['Rectus abdominis', 'External oblique', 'Internal oblique', 'Transverse abdominis'],
    joints: ['Lumbar spine (L1–L5)'],
    tendons: ['Linea alba'],
    strength: ['Hanging leg raise', 'Ab wheel rollout', 'Hollow hold', 'L-sit'],
    mobility: ['Cobra stretch', 'Thoracic extension over roller', 'Cat-cow'],
  },
  'hip-flexors': {
    id: 'hip-flexors', name: 'Hip Flexors',
    muscles: ['Iliopsoas (iliacus + psoas major)', 'Rectus femoris', 'TFL', 'Sartorius'],
    joints: ['Hip joint (ball and socket)', 'Sacroiliac joint'],
    tendons: ['IT band'],
    strength: ['Hip thrust', 'Hanging leg raise', 'Step-up', 'ATG split squat'],
    mobility: ['Couch stretch', 'Hip flexor lunge', 'Pigeon pose', '90/90 hip switch'],
  },
  quads: {
    id: 'quads', name: 'Quadriceps',
    muscles: ['Rectus femoris', 'Vastus lateralis', 'Vastus medialis (VMO)', 'Vastus intermedius'],
    joints: ['Patellofemoral joint', 'Tibiofemoral joint'],
    tendons: ['Quadriceps tendon', 'Patellar tendon'],
    strength: ['Back squat', 'Pendulum squat', 'ATG split squat', 'Walking lunge'],
    mobility: ['ATG split squat (bodyweight)', 'Couch stretch', 'Deep squat hold'],
  },
  knees: {
    id: 'knees', name: 'Knees',
    muscles: ['Gastrocnemius (proximal)', 'Popliteus', 'VMO'],
    joints: ['Tibiofemoral joint', 'Patellofemoral joint', 'Proximal tibiofibular joint'],
    tendons: ['Patellar tendon', 'Quadriceps tendon', 'LCL / MCL'],
    strength: ['ATG split squat', 'Step-down (slow eccentric)', 'Nordic curl', 'Backward treadmill walk'],
    mobility: ['ATG split squat (bodyweight)', 'Tibialis raise', 'Knee circles'],
  },
  calves: {
    id: 'calves', name: 'Calves & Ankles',
    muscles: ['Gastrocnemius', 'Soleus', 'Tibialis anterior', 'Peroneals'],
    joints: ['Talocrural (ankle) joint', 'Subtalar joint'],
    tendons: ['Achilles tendon', 'Tibialis anterior tendon', 'Peroneal tendons'],
    strength: ['Standing calf raise (full ROM)', 'Seated calf raise', 'Tibialis raise', 'Single-leg calf raise'],
    mobility: ['Knee-to-wall drill', 'Deep squat hold', 'Calf stretch on step', 'Ankle circles'],
  },
  traps: {
    id: 'traps', name: 'Trapezius',
    muscles: ['Upper trapezius', 'Middle trapezius', 'Lower trapezius', 'Levator scapulae'],
    joints: ['Cervical spine', 'Thoracic spine (upper)', 'Scapulothoracic joint'],
    tendons: ['Nuchal ligament'],
    strength: ['Shrugs', 'Barbell row', 'Face pull', 'Prone Y-T-W'],
    mobility: ['Lateral neck stretch', 'Thoracic rotation', 'Cat-cow'],
  },
  'upper-back': {
    id: 'upper-back', name: 'Upper Back',
    muscles: ['Rhomboids (major + minor)', 'Middle trapezius', 'Lower trapezius', 'Infraspinatus', 'Teres major'],
    joints: ['Thoracic spine (T1–T12)', 'Scapulothoracic joint'],
    tendons: ['Rhomboid attachments to medial scapula'],
    strength: ['Barbell row', 'Chest-supported row', 'Lat pulldown', 'Pull-up'],
    mobility: ['Thoracic rotation', 'Cat-cow', 'Thread-the-needle stretch'],
  },
  lats: {
    id: 'lats', name: 'Lats',
    muscles: ['Latissimus dorsi', 'Teres major', 'Serratus anterior (lower)'],
    joints: ['Glenohumeral joint', 'Thoracolumbar fascia'],
    tendons: ['Lat insertion (intertubercular groove)'],
    strength: ['Pull-up', 'Lat pulldown', 'Straight-arm pulldown', 'Single-arm row'],
    mobility: ['Wall shoulder flexion', 'Doorway lat stretch', 'Child\'s pose'],
  },
  'lower-back': {
    id: 'lower-back', name: 'Lower Back',
    muscles: ['Erector spinae', 'Multifidus', 'Quadratus lumborum'],
    joints: ['Lumbar spine (L1–L5)', 'Sacroiliac joint'],
    tendons: ['Thoracolumbar fascia'],
    strength: ['Deadlift', 'Good morning', 'Back extension', 'Bird-dog'],
    mobility: ['Jefferson curl (light)', 'Child\'s pose', 'Cat-cow'],
  },
  glutes: {
    id: 'glutes', name: 'Glutes',
    muscles: ['Gluteus maximus', 'Gluteus medius', 'Gluteus minimus', 'Piriformis'],
    joints: ['Hip joint (ball and socket)', 'Sacroiliac joint'],
    tendons: ['Gluteal tendons', 'IT band (proximal)'],
    strength: ['Hip thrust', 'B-stance hip thrust', 'Deadlift', 'Cossack squat', 'Step-up'],
    mobility: ['Pigeon pose', 'Figure-4 stretch', '90/90 hip switch', 'Cossack hold'],
  },
  hamstrings: {
    id: 'hamstrings', name: 'Hamstrings',
    muscles: ['Biceps femoris (long + short head)', 'Semitendinosus', 'Semimembranosus'],
    joints: ['Hip joint', 'Knee joint'],
    tendons: ['Proximal hamstring tendon (ischial)', 'Distal hamstring tendons'],
    strength: ['Romanian deadlift', 'Seated leg curl', 'Nordic curl', 'Good morning'],
    mobility: ['Pike sit against wall', 'Jefferson curl', 'Standing toe touch'],
  },
  adductors: {
    id: 'adductors', name: 'Adductors',
    muscles: ['Adductor longus', 'Adductor brevis', 'Adductor magnus', 'Gracilis', 'Pectineus'],
    joints: ['Hip joint'],
    tendons: ['Adductor tendons (pubic / ischial)'],
    strength: ['Copenhagen plank', 'Adductor machine', 'Cossack squat', 'Side lunge', 'Sumo deadlift'],
    mobility: ['Frog stretch', 'Pancake / straddle', 'Cossack hold', 'Wide-stance squat hold'],
  },
}

// ── Muscle → zone mapping ──────────────────────────────────────

const MUSCLE_TO_ZONE: Partial<Record<Muscle, string>> = {
  trapezius: 'traps',
  'upper-back': 'upper-back',
  'lower-back': 'lower-back',
  chest: 'chest',
  biceps: 'upper-arms',
  triceps: 'upper-arms',
  forearm: 'forearms',
  'back-deltoids': 'shoulders',
  'front-deltoids': 'shoulders',
  abs: 'core',
  obliques: 'core',
  adductor: 'adductors',
  abductors: 'glutes',
  hamstring: 'hamstrings',
  quadriceps: 'quads',
  calves: 'calves',
  'left-soleus': 'calves',
  'right-soleus': 'calves',
  gluteal: 'glutes',
  head: 'neck',
  neck: 'neck',
  knees: 'knees',
}

// ── Zone detail (inline panel, not modal) ──────────────────────

function Group({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.6rem', color: 'var(--muted-hi)', letterSpacing: '0.12em', marginBottom: '0.4rem' }}>{title}</div>
      {items.map(item => (
        <div key={item} style={{ fontSize: '0.78rem', color: 'var(--text)', paddingLeft: '0.6rem', marginBottom: '0.28rem', display: 'flex', gap: '0.35rem' }}>
          <span style={{ color: 'var(--muted-hi)', flexShrink: 0 }}>·</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

function ZoneDetail({ data, onClose }: { data: ZoneData; onClose: () => void }) {
  const [section, setSection] = useState<'muscles' | 'exercises' | 'mobility'>('muscles')
  const COLORS = { muscles: '#7eb8d4', exercises: '#4ade80', mobility: '#fb923c' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.65rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
          {data.name.toUpperCase()}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-hi)', fontSize: '1rem', cursor: 'pointer', padding: '0.15rem 0.3rem', lineHeight: 1 }}>✕</button>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['muscles', 'exercises', 'mobility'] as const).map(s => (
          <button key={s} onClick={() => setSection(s)} style={{
            flex: 1, padding: '0.38rem 0.2rem', fontSize: '0.58rem', letterSpacing: '0.06em',
            fontFamily: 'var(--font-mono)', background: 'none', border: 'none', cursor: 'pointer',
            color: section === s ? COLORS[s] : 'var(--muted-hi)',
            borderBottom: `2px solid ${section === s ? COLORS[s] : 'transparent'}`,
            marginBottom: -1,
          }}>
            {s === 'exercises' ? 'STRENGTH' : s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.75rem 1rem' }}>
        {section === 'muscles' && (
          <>
            <Group title="MUSCLES" items={data.muscles} />
            {data.joints.length > 0 && <Group title="JOINTS" items={data.joints} />}
            {data.tendons.length > 0 && <Group title="TENDONS" items={data.tendons} />}
          </>
        )}
        {section === 'exercises' && <Group title="STRENGTH EXERCISES" items={data.strength} />}
        {section === 'mobility'  && <Group title="MOBILITY & STRETCHING" items={data.mobility} />}
      </div>
    </div>
  )
}

// ── Main BodyMap ───────────────────────────────────────────────

export default function BodyMap() {
  const { theme } = useTheme()
  const [view, setView] = useState<'anterior' | 'posterior'>('anterior')
  const [selectedMuscle, setSelectedMuscle] = useState<Muscle | null>(null)
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)

  const isDark = theme === 'dark'
  const bodyColor   = isDark ? '#152535' : '#c8dae8'
  const accentColor = isDark ? '#7eb8d4' : '#2a78b8'
  const hasSelection = !!activeZoneId

  const handleClick = ({ muscle }: IMuscleStats) => {
    const zoneId = MUSCLE_TO_ZONE[muscle]
    if (!zoneId) return
    if (selectedMuscle === muscle) {
      setSelectedMuscle(null); setActiveZoneId(null)
    } else {
      setSelectedMuscle(muscle); setActiveZoneId(zoneId)
    }
  }

  const close = () => { setSelectedMuscle(null); setActiveZoneId(null) }

  const highlightData = selectedMuscle
    ? [{ name: 'selected', muscles: [selectedMuscle] as Muscle[] }]
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Front / back toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['anterior', 'posterior'] as const).map(v => (
          <button key={v} onClick={() => { setView(v); close() }} style={{
            padding: '0.3rem 1rem', fontSize: '0.7rem', letterSpacing: '0.08em',
            fontFamily: 'var(--font-mono)', fontWeight: view === v ? 700 : 400, cursor: 'pointer',
            background: view === v ? 'var(--accent)' : 'var(--surface)',
            color: view === v ? 'var(--accent-fg)' : 'var(--text2)',
            border: `1px solid ${view === v ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 6,
          }}>
            {v === 'anterior' ? 'FRONT' : 'BACK'}
          </button>
        ))}
      </div>

      {/* Split layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Body figure pane — shrinks when selected */}
        <div style={{
          flexShrink: 0,
          width: hasSelection ? '42%' : '100%',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          padding: hasSelection ? '0.25rem 0.25rem 0.5rem' : '0.5rem 1.5rem 0.5rem',
        }}>
          <Model
            data={highlightData}
            type={view}
            bodyColor={bodyColor}
            highlightedColors={[accentColor]}
            onClick={handleClick}
            style={{ width: '100%', maxWidth: hasSelection ? 150 : 240 }}
          />
          <p style={{ fontSize: '0.6rem', color: hasSelection ? accentColor : 'var(--muted-hi)', letterSpacing: '0.05em', marginTop: '0.3rem', textAlign: 'center' }}>
            {hasSelection && activeZoneId
              ? ZONE_DATA[activeZoneId]?.name.toUpperCase()
              : 'TAP A MUSCLE'}
          </p>
        </div>

        {/* Content pane — slides in */}
        <div style={{
          flexShrink: 0,
          width: hasSelection ? '58%' : '0%',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          borderLeft: hasSelection ? '1px solid var(--border)' : 'none',
          background: 'var(--bg2)',
        }}>
          {activeZoneId && ZONE_DATA[activeZoneId] && (
            <ZoneDetail data={ZONE_DATA[activeZoneId]} onClose={close} />
          )}
        </div>
      </div>
    </div>
  )
}
