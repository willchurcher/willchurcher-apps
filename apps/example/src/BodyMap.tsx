import { useState } from 'react'

// ── Zone data ──────────────────────────────────────────────────

interface ZoneData {
  id: string
  name: string
  muscles: string[]
  joints: string[]
  tendons: string[]
  strength: string[]
  mobility: string[]
  tests: string[]
}

const ZONE_DATA: Record<string, ZoneData> = {
  neck: {
    id: 'neck', name: 'Neck',
    muscles: ['Sternocleidomastoid', 'Scalenes', 'Upper trapezius', 'Levator scapulae'],
    joints: ['Cervical spine (C1–C7)', 'Atlanto-occipital joint', 'Atlanto-axial joint'],
    tendons: ['Nuchal ligament'],
    strength: ['Dead hang', 'Neck flexion/extension (isometric)', 'Shrugs', 'Scapular pull-up'],
    mobility: ['Chin tucks', 'Cervical rotation', 'Lateral neck stretch', 'Neck rolls'],
    tests: ['dead-hang'],
  },
  chest: {
    id: 'chest', name: 'Chest',
    muscles: ['Pectoralis major', 'Pectoralis minor', 'Serratus anterior'],
    joints: ['Sternoclavicular joint', 'Costochondral joints'],
    tendons: ['Pectoralis tendon'],
    strength: ['Bench press', 'Incline DB press', 'Weighted dip', 'Push-up'],
    mobility: ['Doorway pec stretch', 'Foam roll thoracic spine', 'Chest opener on floor'],
    tests: [],
  },
  shoulders: {
    id: 'shoulders', name: 'Shoulders',
    muscles: ['Anterior deltoid', 'Lateral deltoid', 'Posterior deltoid', 'Supraspinatus', 'Infraspinatus', 'Teres minor', 'Subscapularis'],
    joints: ['Glenohumeral joint', 'Acromioclavicular joint', 'Sternoclavicular joint'],
    tendons: ['Supraspinatus tendon', 'Biceps tendon (long head)', 'Rotator cuff tendons'],
    strength: ['Overhead press', 'Lateral raise', 'Face pull', 'Prone Y-T-W raises', 'Scapular pull-up'],
    mobility: ['Shoulder circles', 'Sleeper stretch', 'Cross-body shoulder stretch', 'Wall shoulder flexion'],
    tests: ['dead-hang', 'pull-ups', 'shoulder-feel'],
  },
  'upper-arms': {
    id: 'upper-arms', name: 'Upper Arms',
    muscles: ['Biceps brachii', 'Brachialis', 'Brachioradialis', 'Triceps brachii'],
    joints: ['Elbow joint (humeroulnar)', 'Radioulnar joint'],
    tendons: ['Biceps tendon (distal)', 'Triceps tendon'],
    strength: ['Pull-up', 'Bicep curl', 'Hammer curl', 'Triceps extension', 'Skull crusher'],
    mobility: ['Elbow flexion/extension circles', 'Wrist curls', 'Pronation/supination'],
    tests: ['pull-ups', 'dead-hang'],
  },
  forearms: {
    id: 'forearms', name: 'Forearms & Grip',
    muscles: ['Flexor carpi radialis', 'Flexor digitorum', 'Extensor carpi radialis', 'Pronator teres'],
    joints: ['Radiocarpal (wrist)', 'Distal radioulnar'],
    tendons: ['Finger flexor tendons', 'Extensor tendons'],
    strength: ['Dead hang', 'Farmer carry', 'Hammer curl', 'Wrist roller', 'Pinch grip'],
    mobility: ['Wrist circles', 'Finger extension stretch', 'Prayer stretch', 'Reverse prayer'],
    tests: ['dead-hang'],
  },
  core: {
    id: 'core', name: 'Core / Abs',
    muscles: ['Rectus abdominis', 'External oblique', 'Internal oblique', 'Transverse abdominis'],
    joints: ['Lumbar spine (L1–L5)'],
    tendons: ['Linea alba'],
    strength: ['Hanging leg raise', 'Ab wheel rollout', 'Hollow hold', 'L-sit', 'Dragon flag'],
    mobility: ['Cobra stretch', 'Thoracic extension over roller', 'Cat-cow'],
    tests: ['hollow-hold', 'hanging-leg-raise'],
  },
  'hip-flexors': {
    id: 'hip-flexors', name: 'Hip Flexors',
    muscles: ['Iliopsoas (iliacus + psoas major)', 'Rectus femoris', 'TFL (tensor fasciae latae)', 'Sartorius'],
    joints: ['Hip joint (ball and socket)', 'Sacroiliac joint'],
    tendons: ['IT band (iliotibial band)'],
    strength: ['Hip thrust', 'Hanging leg raise', 'Step-up', 'ATG split squat'],
    mobility: ['Couch stretch', 'Hip flexor lunge', 'Pigeon pose', '90/90 hip switch'],
    tests: ['couch-stretch', 'atg-split-squat'],
  },
  quads: {
    id: 'quads', name: 'Quads',
    muscles: ['Rectus femoris', 'Vastus lateralis', 'Vastus medialis', 'Vastus intermedius'],
    joints: ['Patellofemoral joint', 'Tibiofemoral joint'],
    tendons: ['Quadriceps tendon', 'Patellar tendon'],
    strength: ['Back squat', 'Pendulum squat', 'ATG split squat', 'Leg extension', 'Walking lunge'],
    mobility: ['ATG split squat (bodyweight)', 'Couch stretch', 'Sissy squat hold', 'Deep squat hold'],
    tests: ['atg-split-squat', 'deep-squat-hold', 'knee-feel'],
  },
  knees: {
    id: 'knees', name: 'Knees',
    muscles: ['Gastrocnemius (top)', 'Popliteus', 'VMO (vastus medialis oblique)'],
    joints: ['Tibiofemoral joint', 'Patellofemoral joint', 'Proximal tibiofibular joint'],
    tendons: ['Patellar tendon', 'Quadriceps tendon', 'Pes anserine tendons', 'LCL/MCL'],
    strength: ['ATG split squat', 'Step-down (slow eccentric)', 'Sissy squat', 'Nordic curl', 'Backward treadmill walk'],
    mobility: ['ATG split squat (bodyweight)', 'Tibialis raise', 'Knee circles', 'Patrick step'],
    tests: ['atg-split-squat', 'knee-feel'],
  },
  calves: {
    id: 'calves', name: 'Calves & Ankles',
    muscles: ['Gastrocnemius', 'Soleus', 'Tibialis anterior', 'Peroneals (fibularis longus/brevis)'],
    joints: ['Talocrural (ankle) joint', 'Subtalar joint', 'Midtarsal joint'],
    tendons: ['Achilles tendon', 'Tibialis anterior tendon', 'Peroneal tendons'],
    strength: ['Standing calf raise (full ROM)', 'Seated calf raise (soleus)', 'Tibialis raise', 'Single-leg calf raise'],
    mobility: ['Knee-to-wall dorsiflexion', 'Deep squat hold', 'Calf stretch on step', 'Ankle circles'],
    tests: ['knee-to-wall', 'single-leg-calf-raise', 'deep-squat-hold'],
  },
  traps: {
    id: 'traps', name: 'Traps & Neck (Back)',
    muscles: ['Upper trapezius', 'Middle trapezius', 'Lower trapezius', 'Levator scapulae'],
    joints: ['Cervical spine', 'Thoracic spine (upper)'],
    tendons: ['Nuchal ligament'],
    strength: ['Shrugs', 'Barbell row', 'Face pull', 'Prone Y-T-W raises', 'Dead hang'],
    mobility: ['Lateral neck stretch', 'Thoracic rotation', 'Cat-cow'],
    tests: ['dead-hang'],
  },
  'upper-back': {
    id: 'upper-back', name: 'Upper Back',
    muscles: ['Rhomboids', 'Middle/lower trapezius', 'Posterior deltoid', 'Infraspinatus', 'Teres major'],
    joints: ['Thoracic spine (T1–T12)', 'Scapulothoracic joint'],
    tendons: ['Rhomboid attachments'],
    strength: ['Barbell row', 'Chest-supported row', 'Lat pulldown', 'Pull-up', 'Prone Y-T-W'],
    mobility: ['Thoracic rotation', 'Cat-cow', 'Foam roll thoracic', 'Thread-the-needle stretch'],
    tests: ['pull-ups'],
  },
  lats: {
    id: 'lats', name: 'Lats',
    muscles: ['Latissimus dorsi', 'Teres major', 'Serratus anterior'],
    joints: ['Glenohumeral joint', 'Thoracolumbar fascia'],
    tendons: ['Lat insertion (bicipital groove)'],
    strength: ['Pull-up', 'Lat pulldown', 'Straight-arm pulldown', 'Single-arm row'],
    mobility: ['Wall shoulder flexion', 'Doorway lat stretch', 'Child\'s pose with arm reach'],
    tests: ['pull-ups', 'dead-hang'],
  },
  'lower-back': {
    id: 'lower-back', name: 'Lower Back',
    muscles: ['Erector spinae', 'Multifidus', 'Quadratus lumborum'],
    joints: ['Lumbar spine (L1–L5)', 'Sacroiliac joint', 'Facet joints'],
    tendons: ['Thoracolumbar fascia'],
    strength: ['Deadlift', 'Good morning', 'Back extension / hyperextension', 'Bird-dog'],
    mobility: ['Jefferson curl', 'Child\'s pose', 'Cat-cow', 'Piriformis stretch'],
    tests: ['lower-back-feel', 'jefferson-curl-feel'],
  },
  glutes: {
    id: 'glutes', name: 'Glutes',
    muscles: ['Gluteus maximus', 'Gluteus medius', 'Gluteus minimus', 'Piriformis', 'Gemellus'],
    joints: ['Hip joint (ball and socket)', 'Sacroiliac joint'],
    tendons: ['Gluteal tendons', 'IT band (proximal)'],
    strength: ['Hip thrust', 'B-stance hip thrust', 'Deadlift', 'Cossack squat', 'Step-up', 'Banded lateral walk'],
    mobility: ['Pigeon pose', 'Figure-4 stretch', '90/90 hip switch', 'Cossack squat hold'],
    tests: ['single-leg-rdl', 'couch-stretch'],
  },
  hamstrings: {
    id: 'hamstrings', name: 'Hamstrings',
    muscles: ['Biceps femoris (long + short head)', 'Semitendinosus', 'Semimembranosus'],
    joints: ['Hip joint', 'Knee joint'],
    tendons: ['Proximal hamstring tendon (ischial)', 'Distal hamstring tendons'],
    strength: ['Romanian deadlift', 'Seated leg curl', 'Nordic curl', 'Good morning', 'Glute-ham raise'],
    mobility: ['Pike sit against wall', 'Jefferson curl', 'RDL with full stretch', 'Standing toe touch'],
    tests: ['pike-sit', 'active-slr'],
  },
  adductors: {
    id: 'adductors', name: 'Adductors (Inner Thigh)',
    muscles: ['Adductor longus', 'Adductor brevis', 'Adductor magnus', 'Gracilis', 'Pectineus'],
    joints: ['Hip joint'],
    tendons: ['Adductor tendons (ischial/pubic)'],
    strength: ['Copenhagen plank', 'Adductor machine', 'Cossack squat', 'Side lunge', 'Sumo deadlift'],
    mobility: ['Frog stretch', 'Pancake/straddle', 'Cossack squat hold', 'Wide-stance squat hold'],
    tests: ['copenhagen-plank', 'cossack-squat'],
  },
}

// ── SVG zone definitions ───────────────────────────────────────

interface ZoneDef {
  dataId: string
  view: 'front' | 'back'
  shape: 'polygon' | 'ellipse' | 'circle'
  points?: string
  cx?: number; cy?: number; rx?: number; ry?: number; r?: number
  labelX: number; labelY: number
}

const ZONES: ZoneDef[] = [
  // ── Front zones ──────────────────────────────────────────────
  { dataId: 'neck',        view: 'front', shape: 'polygon', points: '90,58 110,58 108,74 92,74',                   labelX: 100, labelY: 67 },
  { dataId: 'chest',       view: 'front', shape: 'polygon', points: '40,74 160,74 142,152 58,152',                 labelX: 100, labelY: 108 },
  { dataId: 'core',        view: 'front', shape: 'polygon', points: '58,152 142,152 138,208 62,208',               labelX: 100, labelY: 178 },
  { dataId: 'hip-flexors', view: 'front', shape: 'polygon', points: '62,208 138,208 148,242 52,242',               labelX: 100, labelY: 222 },
  { dataId: 'shoulders',   view: 'front', shape: 'polygon', points: '16,74 42,74 38,106 12,96',                    labelX: 22,  labelY: 87 },
  { dataId: 'shoulders',   view: 'front', shape: 'polygon', points: '158,74 184,74 188,96 162,106',                labelX: 178, labelY: 87 },
  { dataId: 'upper-arms',  view: 'front', shape: 'polygon', points: '10,98 38,108 34,164 6,154',                   labelX: 17,  labelY: 132 },
  { dataId: 'upper-arms',  view: 'front', shape: 'polygon', points: '162,108 190,98 194,154 166,164',              labelX: 183, labelY: 132 },
  { dataId: 'forearms',    view: 'front', shape: 'polygon', points: '6,156 34,166 28,244 2,234',                   labelX: 14,  labelY: 203 },
  { dataId: 'forearms',    view: 'front', shape: 'polygon', points: '166,166 194,156 198,234 172,244',             labelX: 186, labelY: 203 },
  { dataId: 'quads',       view: 'front', shape: 'polygon', points: '52,242 92,242 88,328 54,328',                 labelX: 71,  labelY: 284 },
  { dataId: 'quads',       view: 'front', shape: 'polygon', points: '108,242 148,242 146,328 112,328',             labelX: 129, labelY: 284 },
  { dataId: 'knees',       view: 'front', shape: 'polygon', points: '54,330 88,330 86,348 56,348',                 labelX: 71,  labelY: 340 },
  { dataId: 'knees',       view: 'front', shape: 'polygon', points: '112,330 146,330 144,348 114,348',             labelX: 129, labelY: 340 },
  { dataId: 'calves',      view: 'front', shape: 'polygon', points: '56,350 86,350 82,422 58,422',                 labelX: 71,  labelY: 386 },
  { dataId: 'calves',      view: 'front', shape: 'polygon', points: '114,350 144,350 142,422 118,422',             labelX: 129, labelY: 386 },
  { dataId: 'adductors',   view: 'front', shape: 'polygon', points: '92,242 108,242 112,328 88,328',               labelX: 100, labelY: 286 },

  // ── Back zones ───────────────────────────────────────────────
  { dataId: 'traps',       view: 'back',  shape: 'polygon', points: '40,74 160,74 148,110 52,110',                 labelX: 100, labelY: 90 },
  { dataId: 'upper-back',  view: 'back',  shape: 'polygon', points: '52,110 148,110 142,165 58,165',               labelX: 100, labelY: 136 },
  { dataId: 'lats',        view: 'back',  shape: 'polygon', points: '16,74 42,74 40,106 14,96',                    labelX: 22,  labelY: 90 },
  { dataId: 'lats',        view: 'back',  shape: 'polygon', points: '158,74 184,74 186,96 160,106',                labelX: 178, labelY: 90 },
  { dataId: 'lower-back',  view: 'back',  shape: 'polygon', points: '58,165 142,165 138,208 62,208',               labelX: 100, labelY: 186 },
  { dataId: 'glutes',      view: 'back',  shape: 'polygon', points: '52,242 148,242 146,296 54,296',               labelX: 100, labelY: 268 },
  { dataId: 'hamstrings',  view: 'back',  shape: 'polygon', points: '52,296 92,296 88,328 54,328',                 labelX: 71,  labelY: 312 },
  { dataId: 'hamstrings',  view: 'back',  shape: 'polygon', points: '108,296 148,296 146,328 112,328',             labelX: 129, labelY: 312 },
  { dataId: 'upper-arms',  view: 'back',  shape: 'polygon', points: '10,98 38,108 34,164 6,154',                   labelX: 17,  labelY: 132 },
  { dataId: 'upper-arms',  view: 'back',  shape: 'polygon', points: '162,108 190,98 194,154 166,164',              labelX: 183, labelY: 132 },
  { dataId: 'forearms',    view: 'back',  shape: 'polygon', points: '6,156 34,166 28,244 2,234',                   labelX: 14,  labelY: 203 },
  { dataId: 'forearms',    view: 'back',  shape: 'polygon', points: '166,166 194,156 198,234 172,244',             labelX: 186, labelY: 203 },
  { dataId: 'knees',       view: 'back',  shape: 'polygon', points: '54,330 88,330 86,348 56,348',                 labelX: 71,  labelY: 340 },
  { dataId: 'knees',       view: 'back',  shape: 'polygon', points: '112,330 146,330 144,348 114,348',             labelX: 129, labelY: 340 },
  { dataId: 'calves',      view: 'back',  shape: 'polygon', points: '56,350 86,350 82,422 58,422',                 labelX: 71,  labelY: 386 },
  { dataId: 'calves',      view: 'back',  shape: 'polygon', points: '114,350 144,350 142,422 118,422',             labelX: 129, labelY: 386 },
  { dataId: 'adductors',   view: 'back',  shape: 'polygon', points: '92,296 108,296 112,328 88,328',               labelX: 100, labelY: 312 },
  { dataId: 'neck',        view: 'back',  shape: 'polygon', points: '90,58 110,58 108,74 92,74',                   labelX: 100, labelY: 67 },

  // hip-flexors not visible from back — glutes replace that area
  { dataId: 'hip-flexors', view: 'back',  shape: 'polygon', points: '62,208 138,208 148,242 52,242',               labelX: 100, labelY: 222 },
]


const ZONE_COLORS: Record<string, string> = {
  neck: '#7eb8d4',
  chest: '#a78bfa',
  shoulders: '#60a5fa',
  'upper-arms': '#34d399',
  forearms: '#6ee7b7',
  core: '#f472b6',
  'hip-flexors': '#fb923c',
  quads: '#facc15',
  knees: '#94a3b8',
  calves: '#22d3ee',
  traps: '#60a5fa',
  'upper-back': '#a78bfa',
  lats: '#34d399',
  'lower-back': '#f87171',
  glutes: '#fb923c',
  hamstrings: '#facc15',
  adductors: '#c084fc',
}

// ── Body figure SVG ────────────────────────────────────────────

function BodyFigure({ view, activeId, onZoneTap }: {
  view: 'front' | 'back'
  activeId: string | null
  onZoneTap: (id: string) => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const zones = ZONES.filter(z => z.view === view)

  const getColor = (dataId: string) => ZONE_COLORS[dataId] ?? '#7eb8d4'

  const isActive = (dataId: string) => dataId === activeId || dataId === hoverId

  // Track which dataIds have had their label rendered already (avoid duplicate labels)
  const renderedLabels = new Set<string>()

  return (
    <svg
      viewBox="0 0 200 450"
      style={{ width: '100%', maxWidth: 240, display: 'block', margin: '0 auto' }}
    >
      {/* Background silhouette */}
      <ellipse cx="100" cy="32" rx="26" ry="27" fill="var(--surface2)" stroke="var(--border-hi)" strokeWidth="1" />
      {/* Neck */}
      <polygon points="90,58 110,58 108,74 92,74" fill="var(--surface2)" stroke="var(--border)" strokeWidth="0.5" />
      {/* Combined body silhouette */}
      <polygon
        points="40,74 160,74 184,74 190,98 194,156 198,234 184,244 172,244 148,242 148,296 146,328 144,348 142,422 148,450 58,450 56,422 54,348 52,328 54,296 52,242 28,244 16,244 2,234 6,156 10,98 16,74 40,74"
        fill="var(--surface2)" stroke="var(--border-hi)" strokeWidth="1"
      />
      {/* Arms */}
      <polygon points="10,98 38,108 34,164 6,154" fill="var(--surface2)" stroke="var(--border)" strokeWidth="0.5" />
      <polygon points="162,108 190,98 194,154 166,164" fill="var(--surface2)" stroke="var(--border)" strokeWidth="0.5" />
      <polygon points="6,156 34,166 28,244 2,234" fill="var(--surface2)" stroke="var(--border)" strokeWidth="0.5" />
      <polygon points="166,166 194,156 198,234 172,244" fill="var(--surface2)" stroke="var(--border)" strokeWidth="0.5" />

      {/* Interactive zones */}
      {zones.map((z, i) => {
        const active = isActive(z.dataId)
        const color = getColor(z.dataId)
        const showLabel = !renderedLabels.has(z.dataId)
        if (showLabel) renderedLabels.add(z.dataId)

        return (
          <g key={`${z.dataId}-${i}`}
            onClick={() => onZoneTap(z.dataId)}
            onMouseEnter={() => setHoverId(z.dataId)}
            onMouseLeave={() => setHoverId(null)}
            style={{ cursor: 'pointer' }}
          >
            {z.shape === 'polygon' && z.points && (
              <polygon
                points={z.points}
                fill={color}
                fillOpacity={active ? 0.55 : 0.18}
                stroke={color}
                strokeWidth={active ? 1.5 : 0.75}
                strokeOpacity={active ? 1 : 0.5}
              />
            )}
            {z.shape === 'ellipse' && (
              <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                fill={color} fillOpacity={active ? 0.55 : 0.18}
                stroke={color} strokeWidth={active ? 1.5 : 0.75} strokeOpacity={active ? 1 : 0.5}
              />
            )}
            {showLabel && (
              <text x={z.labelX} y={z.labelY} textAnchor="middle" fontSize={6.5}
                fill={active ? color : 'var(--text2)'}
                fontFamily="var(--font-mono)"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {ZONE_DATA[z.dataId]?.name.toUpperCase() ?? z.dataId.toUpperCase()}
              </text>
            )}
          </g>
        )
      })}

      {/* Head always on top */}
      <ellipse cx="100" cy="32" rx="26" ry="27"
        fill="var(--surface)" stroke="var(--border-hi)" strokeWidth="1" fillOpacity="0.6"
        style={{ pointerEvents: 'none' }}
      />
      <text x="100" y="35" textAnchor="middle" fontSize="7" fill="var(--text2)" fontFamily="var(--font-mono)" style={{ pointerEvents: 'none' }}>HEAD</text>
    </svg>
  )
}

// ── Zone detail panel ──────────────────────────────────────────

function ZonePanel({ zoneId, onClose }: { zoneId: string; onClose: () => void }) {
  const data = ZONE_DATA[zoneId]
  const [section, setSection] = useState<'muscles' | 'exercises' | 'mobility'>('muscles')
  if (!data) return null

  const color = ZONE_COLORS[zoneId] ?? 'var(--accent)'

  const Section = ({ title, items, color }: { title: string; items: string[]; color?: string }) => (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--muted-hi)', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>{title}</div>
      {items.map(item => (
        <div key={item} style={{ fontSize: '0.82rem', color: color ?? 'var(--text)', paddingLeft: '0.75rem', marginBottom: '0.25rem', display: 'flex', gap: '0.4rem' }}>
          <span style={{ color: 'var(--muted-hi)', flexShrink: 0 }}>·</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--bg2)', borderRadius: '16px 16px 0 0', maxHeight: '72vh', display: 'flex', flexDirection: 'column' }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border-hi)', borderRadius: 2, margin: '0.75rem auto 0' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.25rem 0.5rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, marginRight: '0.6rem', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: '1rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
            {data.name.toUpperCase()}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-hi)', fontSize: '1.1rem', cursor: 'pointer', padding: '0.25rem' }}>✕</button>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 1.25rem' }}>
          {(['muscles', 'exercises', 'mobility'] as const).map(s => (
            <button key={s} onClick={() => setSection(s)} style={{
              padding: '0.5rem 0.75rem', fontSize: '0.72rem', letterSpacing: '0.07em',
              fontFamily: 'var(--font-mono)', background: 'none', border: 'none', cursor: 'pointer',
              color: section === s ? color : 'var(--muted-hi)',
              borderBottom: `2px solid ${section === s ? color : 'transparent'}`,
              marginBottom: -1,
            }}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.25rem 2.5rem' }}>
          {section === 'muscles' && (
            <>
              <Section title="MUSCLES" items={data.muscles} />
              {data.joints.length > 0 && <Section title="JOINTS" items={data.joints} />}
              {data.tendons.length > 0 && <Section title="TENDONS & LIGAMENTS" items={data.tendons} />}
            </>
          )}
          {section === 'exercises' && (
            <Section title="STRENGTH EXERCISES" items={data.strength} color="var(--text)" />
          )}
          {section === 'mobility' && (
            <Section title="MOBILITY & STRETCHING" items={data.mobility} color="var(--text)" />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main BodyMap export ────────────────────────────────────────

export default function BodyMap() {
  const [view, setView] = useState<'front' | 'back'>('front')
  const [activeId, setActiveId] = useState<string | null>(null)

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Front / back toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem 1rem 0.5rem' }}>
        {(['front', 'back'] as const).map(v => (
          <button key={v} onClick={() => { setView(v); setActiveId(null) }} style={{
            padding: '0.4rem 1.2rem', fontSize: '0.72rem', letterSpacing: '0.08em',
            fontFamily: 'var(--font-mono)', fontWeight: view === v ? 700 : 400, cursor: 'pointer',
            background: view === v ? 'var(--accent)' : 'var(--surface)',
            color: view === v ? 'var(--accent-fg)' : 'var(--text2)',
            border: `1px solid ${view === v ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8,
          }}>
            {v.toUpperCase()}
          </button>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--muted-hi)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
        TAP A ZONE TO EXPLORE
      </p>

      <BodyFigure view={view} activeId={activeId} onZoneTap={id => setActiveId(id)} />

      {/* Legend */}
      <div style={{ padding: '1rem 1.25rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.75rem' }}>
        {[...new Set(ZONES.filter(z => z.view === view).map(z => z.dataId))].map(id => (
          <button key={id} onClick={() => setActiveId(id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.2rem 0.5rem', borderRadius: 6, cursor: 'pointer',
            background: activeId === id ? ZONE_COLORS[id] + '33' : 'transparent',
            border: `1px solid ${activeId === id ? ZONE_COLORS[id] : 'var(--border)'}`,
            fontFamily: 'var(--font-mono)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: ZONE_COLORS[id] ?? 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', color: activeId === id ? 'var(--text)' : 'var(--text2)' }}>
              {ZONE_DATA[id]?.name ?? id}
            </span>
          </button>
        ))}
      </div>

      {activeId && (
        <ZonePanel zoneId={activeId} onClose={() => setActiveId(null)} />
      )}
    </div>
  )
}
