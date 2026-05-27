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
    joints: ['Cervical spine (C1–C7)', 'Atlanto-occipital joint', 'Atlanto-axial joint'],
    tendons: ['Nuchal ligament'],
    strength: ['Dead hang', 'Neck flexion/extension (isometric)', 'Shrugs', 'Scapular pull-up'],
    mobility: ['Chin tucks', 'Cervical rotation stretches', 'Lateral neck stretch', 'Neck rolls'],
  },
  chest: {
    id: 'chest', name: 'Chest',
    muscles: ['Pectoralis major', 'Pectoralis minor', 'Serratus anterior'],
    joints: ['Sternoclavicular joint', 'Costochondral joints'],
    tendons: ['Pectoralis tendon'],
    strength: ['Bench press', 'Incline DB press', 'Weighted dip', 'Push-up'],
    mobility: ['Doorway pec stretch', 'Foam roll thoracic spine', 'Chest opener on floor'],
  },
  shoulders: {
    id: 'shoulders', name: 'Shoulders',
    muscles: ['Anterior deltoid', 'Lateral deltoid', 'Posterior deltoid', 'Supraspinatus', 'Infraspinatus', 'Teres minor', 'Subscapularis'],
    joints: ['Glenohumeral joint', 'Acromioclavicular joint', 'Sternoclavicular joint'],
    tendons: ['Supraspinatus tendon', 'Biceps tendon (long head)', 'Rotator cuff tendons'],
    strength: ['Overhead press', 'Lateral raise', 'Face pull', 'Prone Y-T-W raises', 'Scapular pull-up'],
    mobility: ['Shoulder circles', 'Sleeper stretch', 'Cross-body shoulder stretch', 'Wall shoulder flexion'],
  },
  'upper-arms': {
    id: 'upper-arms', name: 'Upper Arms',
    muscles: ['Biceps brachii', 'Brachialis', 'Brachioradialis', 'Triceps brachii (all 3 heads)'],
    joints: ['Elbow joint (humeroulnar)', 'Humeroradial joint'],
    tendons: ['Biceps tendon (distal)', 'Triceps tendon'],
    strength: ['Pull-up', 'Bicep curl', 'Hammer curl', 'Triceps extension', 'Skull crusher', 'Close-grip bench'],
    mobility: ['Elbow extension stretch', 'Overhead triceps stretch', 'Wrist flexion/extension'],
  },
  forearms: {
    id: 'forearms', name: 'Forearms & Grip',
    muscles: ['Flexor carpi radialis', 'Flexor digitorum superficialis', 'Extensor carpi radialis', 'Pronator teres', 'Brachioradialis'],
    joints: ['Radiocarpal (wrist) joint', 'Distal radioulnar joint'],
    tendons: ['Finger flexor tendons', 'Extensor tendons'],
    strength: ['Dead hang', 'Farmer carry', 'Hammer curl', 'Wrist roller', 'Pinch grip hold'],
    mobility: ['Wrist circles', 'Finger extension stretch', 'Prayer stretch', 'Reverse prayer'],
  },
  core: {
    id: 'core', name: 'Core & Abs',
    muscles: ['Rectus abdominis', 'External oblique', 'Internal oblique', 'Transverse abdominis'],
    joints: ['Lumbar spine (L1–L5)'],
    tendons: ['Linea alba'],
    strength: ['Hanging leg raise', 'Ab wheel rollout', 'Hollow hold', 'L-sit', 'Dragon flag negative'],
    mobility: ['Cobra stretch', 'Thoracic extension over roller', 'Cat-cow'],
  },
  'hip-flexors': {
    id: 'hip-flexors', name: 'Hip Flexors',
    muscles: ['Iliopsoas (iliacus + psoas major)', 'Rectus femoris', 'TFL (tensor fasciae latae)', 'Sartorius'],
    joints: ['Hip joint (ball and socket)', 'Sacroiliac joint'],
    tendons: ['IT band (iliotibial band)'],
    strength: ['Hip thrust', 'Hanging leg raise', 'Step-up', 'ATG split squat'],
    mobility: ['Couch stretch', 'Hip flexor lunge', 'Pigeon pose', '90/90 hip switch'],
  },
  quads: {
    id: 'quads', name: 'Quadriceps',
    muscles: ['Rectus femoris', 'Vastus lateralis', 'Vastus medialis (VMO)', 'Vastus intermedius'],
    joints: ['Patellofemoral joint', 'Tibiofemoral joint'],
    tendons: ['Quadriceps tendon', 'Patellar tendon'],
    strength: ['Back squat', 'Pendulum squat', 'ATG split squat', 'Leg extension', 'Walking lunge'],
    mobility: ['ATG split squat (bodyweight)', 'Couch stretch', 'Sissy squat hold', 'Deep squat hold'],
  },
  knees: {
    id: 'knees', name: 'Knees',
    muscles: ['Gastrocnemius (proximal)', 'Popliteus', 'VMO (vastus medialis oblique)'],
    joints: ['Tibiofemoral joint', 'Patellofemoral joint', 'Proximal tibiofibular joint'],
    tendons: ['Patellar tendon', 'Quadriceps tendon', 'Pes anserine tendons', 'LCL / MCL'],
    strength: ['ATG split squat', 'Step-down (slow eccentric)', 'Sissy squat', 'Nordic curl', 'Backward treadmill walk'],
    mobility: ['ATG split squat (bodyweight)', 'Tibialis raise', 'Knee circles', 'Patrick step'],
  },
  calves: {
    id: 'calves', name: 'Calves & Ankles',
    muscles: ['Gastrocnemius', 'Soleus', 'Tibialis anterior', 'Peroneals (fibularis longus/brevis)'],
    joints: ['Talocrural (ankle) joint', 'Subtalar joint', 'Midtarsal joint'],
    tendons: ['Achilles tendon', 'Tibialis anterior tendon', 'Peroneal tendons'],
    strength: ['Standing calf raise (full ROM)', 'Seated calf raise (soleus)', 'Tibialis raise', 'Single-leg calf raise'],
    mobility: ['Knee-to-wall dorsiflexion drill', 'Deep squat hold', 'Calf stretch on step', 'Ankle circles'],
  },
  traps: {
    id: 'traps', name: 'Trapezius',
    muscles: ['Upper trapezius', 'Middle trapezius', 'Lower trapezius', 'Levator scapulae'],
    joints: ['Cervical spine', 'Thoracic spine (upper)', 'Scapulothoracic joint'],
    tendons: ['Nuchal ligament'],
    strength: ['Shrugs', 'Barbell row', 'Face pull', 'Prone Y-T-W raises', 'Dead hang'],
    mobility: ['Lateral neck stretch', 'Thoracic rotation', 'Cat-cow', 'Chin tucks'],
  },
  'upper-back': {
    id: 'upper-back', name: 'Upper Back',
    muscles: ['Rhomboids (major + minor)', 'Middle trapezius', 'Lower trapezius', 'Infraspinatus', 'Teres major'],
    joints: ['Thoracic spine (T1–T12)', 'Scapulothoracic joint'],
    tendons: ['Rhomboid attachments to medial scapula'],
    strength: ['Barbell row', 'Chest-supported row', 'Lat pulldown', 'Pull-up', 'Prone Y-T-W'],
    mobility: ['Thoracic rotation', 'Cat-cow', 'Foam roll thoracic', 'Thread-the-needle stretch'],
  },
  lats: {
    id: 'lats', name: 'Lats',
    muscles: ['Latissimus dorsi', 'Teres major', 'Serratus anterior (lower)'],
    joints: ['Glenohumeral joint', 'Thoracolumbar fascia attachment'],
    tendons: ['Lat insertion (intertubercular groove of humerus)'],
    strength: ['Pull-up', 'Lat pulldown', 'Straight-arm pulldown', 'Single-arm dumbbell row'],
    mobility: ['Wall shoulder flexion', 'Doorway lat stretch', 'Child\'s pose with arm reach'],
  },
  'lower-back': {
    id: 'lower-back', name: 'Lower Back',
    muscles: ['Erector spinae (iliocostalis, longissimus, spinalis)', 'Multifidus', 'Quadratus lumborum'],
    joints: ['Lumbar spine (L1–L5)', 'Sacroiliac joint', 'Facet joints'],
    tendons: ['Thoracolumbar fascia'],
    strength: ['Deadlift', 'Good morning', 'Back extension / hyperextension', 'Bird-dog'],
    mobility: ['Jefferson curl (light)', 'Child\'s pose', 'Cat-cow', 'Piriformis stretch'],
  },
  glutes: {
    id: 'glutes', name: 'Glutes',
    muscles: ['Gluteus maximus', 'Gluteus medius', 'Gluteus minimus', 'Piriformis', 'Gemellus'],
    joints: ['Hip joint (ball and socket)', 'Sacroiliac joint'],
    tendons: ['Gluteal tendons', 'IT band (proximal attachment)'],
    strength: ['Hip thrust', 'B-stance hip thrust', 'Deadlift', 'Cossack squat', 'Step-up', 'Banded lateral walk'],
    mobility: ['Pigeon pose', 'Figure-4 stretch', '90/90 hip switch', 'Cossack squat hold'],
  },
  hamstrings: {
    id: 'hamstrings', name: 'Hamstrings',
    muscles: ['Biceps femoris (long + short head)', 'Semitendinosus', 'Semimembranosus'],
    joints: ['Hip joint', 'Knee joint'],
    tendons: ['Proximal hamstring tendon (ischial tuberosity)', 'Distal hamstring tendons'],
    strength: ['Romanian deadlift', 'Seated leg curl', 'Nordic curl', 'Good morning', 'Glute-ham raise'],
    mobility: ['Pike sit against wall', 'Jefferson curl', 'RDL with full stretch', 'Standing toe touch'],
  },
  adductors: {
    id: 'adductors', name: 'Adductors',
    muscles: ['Adductor longus', 'Adductor brevis', 'Adductor magnus', 'Gracilis', 'Pectineus'],
    joints: ['Hip joint'],
    tendons: ['Adductor tendons (pubic / ischial attachment)'],
    strength: ['Copenhagen plank', 'Adductor machine', 'Cossack squat', 'Side lunge', 'Sumo deadlift'],
    mobility: ['Frog stretch', 'Pancake / straddle', 'Cossack squat hold', 'Wide-stance squat hold'],
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

// ── Zone panel ─────────────────────────────────────────────────

function ZonePanel({ zoneId, onClose }: { zoneId: string; onClose: () => void }) {
  const data = ZONE_DATA[zoneId]
  const [section, setSection] = useState<'muscles' | 'exercises' | 'mobility'>('muscles')
  if (!data) return null

  const SECTION_COLORS: Record<string, string> = {
    muscles: '#7eb8d4',
    exercises: '#4ade80',
    mobility: '#fb923c',
  }

  const Item = ({ text }: { text: string }) => (
    <div style={{ fontSize: '0.82rem', color: 'var(--text)', paddingLeft: '0.75rem', marginBottom: '0.3rem', display: 'flex', gap: '0.4rem' }}>
      <span style={{ color: 'var(--muted-hi)', flexShrink: 0 }}>·</span>
      <span>{text}</span>
    </div>
  )

  const Group = ({ title, items }: { title: string; items: string[] }) => (
    <div style={{ marginBottom: '1.1rem' }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--muted-hi)', letterSpacing: '0.12em', marginBottom: '0.45rem' }}>{title}</div>
      {items.map(item => <Item key={item} text={item} />)}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--bg2)', borderRadius: '16px 16px 0 0', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 36, height: 4, background: 'var(--border-hi)', borderRadius: 2, margin: '0.75rem auto 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '0.65rem 1.25rem 0.5rem' }}>
          <span style={{ flex: 1, fontSize: '1rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
            {data.name.toUpperCase()}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-hi)', fontSize: '1.1rem', cursor: 'pointer', padding: '0.25rem' }}>✕</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 1.25rem' }}>
          {(['muscles', 'exercises', 'mobility'] as const).map(s => (
            <button key={s} onClick={() => setSection(s)} style={{
              padding: '0.45rem 0.7rem', fontSize: '0.7rem', letterSpacing: '0.07em',
              fontFamily: 'var(--font-mono)', background: 'none', border: 'none', cursor: 'pointer',
              color: section === s ? SECTION_COLORS[s] : 'var(--muted-hi)',
              borderBottom: `2px solid ${section === s ? SECTION_COLORS[s] : 'transparent'}`,
              marginBottom: -1,
            }}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.25rem 2.5rem' }}>
          {section === 'muscles' && (
            <>
              <Group title="MUSCLES" items={data.muscles} />
              {data.joints.length > 0 && <Group title="JOINTS" items={data.joints} />}
              {data.tendons.length > 0 && <Group title="TENDONS & LIGAMENTS" items={data.tendons} />}
            </>
          )}
          {section === 'exercises' && <Group title="STRENGTH EXERCISES" items={data.strength} />}
          {section === 'mobility' && <Group title="MOBILITY & STRETCHING" items={data.mobility} />}
        </div>

        <div style={{ padding: '0.5rem 1.25rem 1.5rem', fontSize: '0.68rem', color: 'var(--muted-hi)', textAlign: 'center' }}>
          Tap another muscle to switch zone
        </div>
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
  const bodyColor = isDark ? '#152535' : '#c8dae8'
  const accentColor = isDark ? '#7eb8d4' : '#2a78b8'

  const handleClick = ({ muscle }: IMuscleStats) => {
    const zoneId = MUSCLE_TO_ZONE[muscle]
    if (!zoneId) return
    setSelectedMuscle(muscle)
    setActiveZoneId(zoneId)
  }

  const highlightData = selectedMuscle
    ? [{ name: 'selected', muscles: [selectedMuscle] as Muscle[] }]
    : []

  const zoneLabel = activeZoneId ? ZONE_DATA[activeZoneId]?.name : null

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Front / back toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem 1rem 0.25rem' }}>
        {(['anterior', 'posterior'] as const).map(v => (
          <button key={v} onClick={() => { setView(v); setSelectedMuscle(null); setActiveZoneId(null) }} style={{
            padding: '0.4rem 1.2rem', fontSize: '0.72rem', letterSpacing: '0.08em',
            fontFamily: 'var(--font-mono)', fontWeight: view === v ? 700 : 400, cursor: 'pointer',
            background: view === v ? 'var(--accent)' : 'var(--surface)',
            color: view === v ? 'var(--accent-fg)' : 'var(--text2)',
            border: `1px solid ${view === v ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8,
          }}>
            {v === 'anterior' ? 'FRONT' : 'BACK'}
          </button>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--muted-hi)', margin: '0.3rem 0 0.5rem', letterSpacing: '0.05em' }}>
        {zoneLabel ? `Selected: ${zoneLabel}` : 'TAP A MUSCLE TO EXPLORE'}
      </p>

      {/* Body model */}
      <div style={{ padding: '0 1rem' }}>
        <Model
          data={highlightData}
          type={view}
          bodyColor={bodyColor}
          highlightedColors={[accentColor]}
          onClick={handleClick}
          style={{ width: '100%', maxWidth: 280, margin: '0 auto', display: 'block' }}
        />
      </div>

      {/* Quick-access legend below the figure */}
      <div style={{ padding: '0.75rem 1.25rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.6rem' }}>
        {Object.values(ZONE_DATA).map(z => (
          <button key={z.id} onClick={() => setActiveZoneId(activeZoneId === z.id ? null : z.id)} style={{
            padding: '0.2rem 0.55rem', borderRadius: 6, cursor: 'pointer',
            background: activeZoneId === z.id ? 'var(--accent)' : 'var(--surface)',
            color: activeZoneId === z.id ? 'var(--accent-fg)' : 'var(--text2)',
            border: `1px solid ${activeZoneId === z.id ? 'var(--accent)' : 'var(--border)'}`,
            fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
          }}>
            {z.name}
          </button>
        ))}
      </div>

      {activeZoneId && (
        <ZonePanel
          zoneId={activeZoneId}
          onClose={() => { setActiveZoneId(null); setSelectedMuscle(null) }}
        />
      )}
    </div>
  )
}
