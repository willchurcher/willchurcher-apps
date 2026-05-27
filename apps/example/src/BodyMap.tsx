import { useState } from 'react'
import Body from 'react-muscle-highlighter'
import type { ExtendedBodyPart, Slug } from 'react-muscle-highlighter'
import { useTheme } from './ThemeContext'

type Layer = 'muscles' | 'joints' | 'tendons' | 'fascia'

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
    mobility: ['Wall shoulder flexion', 'Doorway lat stretch', "Child's pose"],
  },
  'lower-back': {
    id: 'lower-back', name: 'Lower Back',
    muscles: ['Erector spinae', 'Multifidus', 'Quadratus lumborum'],
    joints: ['Lumbar spine (L1–L5)', 'Sacroiliac joint'],
    tendons: ['Thoracolumbar fascia'],
    strength: ['Deadlift', 'Good morning', 'Back extension', 'Bird-dog'],
    mobility: ["Jefferson curl (light)", "Child's pose", 'Cat-cow'],
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

// ── Slug ↔ zone mappings ───────────────────────────────────────

const SLUG_TO_ZONE: Partial<Record<Slug, string>> = {
  trapezius:    'traps',
  'upper-back': 'upper-back',
  'lower-back': 'lower-back',
  chest:        'chest',
  biceps:       'upper-arms',
  triceps:      'upper-arms',
  forearm:      'forearms',
  hands:        'forearms',
  deltoids:     'shoulders',
  abs:          'core',
  obliques:     'core',
  adductors:    'adductors',
  gluteal:      'glutes',
  hamstring:    'hamstrings',
  quadriceps:   'quads',
  calves:       'calves',
  tibialis:     'calves',
  ankles:       'calves',
  feet:         'calves',
  head:         'neck',
  neck:         'neck',
  knees:        'knees',
}

const ZONE_TO_SLUGS: Partial<Record<string, Slug[]>> = {
  traps:        ['trapezius'],
  'upper-back': ['upper-back'],
  'lower-back': ['lower-back'],
  chest:        ['chest'],
  'upper-arms': ['biceps', 'triceps'],
  forearms:     ['forearm', 'hands'],
  shoulders:    ['deltoids'],
  core:         ['abs', 'obliques'],
  adductors:    ['adductors'],
  glutes:       ['gluteal'],
  hamstrings:   ['hamstring'],
  quads:        ['quadriceps'],
  calves:       ['calves', 'tibialis', 'ankles', 'feet'],
  neck:         ['head', 'neck'],
  knees:        ['knees'],
}

// ── Health colours ─────────────────────────────────────────────

const HEALTH_COLORS = ['#f87171', '#fb923c', '#facc15', '#86efac', '#4ade80']

function scoreColor(s: number): string {
  if (s >= 4.5) return '#4ade80'
  if (s >= 3.5) return '#86efac'
  if (s >= 2.5) return '#facc15'
  if (s >= 1.5) return '#fb923c'
  return '#f87171'
}

// ── Anatomy overlay data ───────────────────────────────────────
// SVG viewBox: front = "0 0 724 1448", back = "724 0 724 1448"
// Body is rendered at 200*scale × 400*scale px

interface JointDef {
  id: string
  name: string
  zoneId?: string
  front?: [number, number][]
  back?: [number, number][]
}

const JOINTS: JointDef[] = [
  { id: 'cervical',          name: 'Cervical spine',     zoneId: 'neck',        front: [[362, 195]],                    back: [[1086, 195]] },
  { id: 'glenohumeral',      name: 'Glenohumeral',       zoneId: 'shoulders',   front: [[175, 315], [552, 315]],        back: [[899, 315], [1276, 315]] },
  { id: 'acromioclavicular', name: 'Acromioclavicular',  zoneId: 'shoulders',   front: [[168, 293], [558, 293]],        back: [[892, 293], [1282, 293]] },
  { id: 'elbow',             name: 'Elbow',              zoneId: 'upper-arms',  front: [[142, 508], [585, 508]],        back: [[866, 508], [1309, 508]] },
  { id: 'wrist',             name: 'Wrist',              zoneId: 'forearms',    front: [[112, 715], [615, 715]],        back: [[836, 715], [1339, 715]] },
  { id: 'hip',               name: 'Hip',                zoneId: 'hip-flexors', front: [[252, 660], [474, 660]],        back: [[976, 660], [1198, 660]] },
  { id: 'sacroiliac',        name: 'Sacroiliac',         zoneId: 'lower-back',                                          back: [[1010, 664], [1162, 664]] },
  { id: 'patellofemoral',    name: 'Patellofemoral',     zoneId: 'knees',       front: [[252, 933], [474, 933]] },
  { id: 'tibiofemoral',      name: 'Tibiofemoral',       zoneId: 'knees',       front: [[252, 968], [474, 968]],        back: [[976, 968], [1198, 968]] },
  { id: 'talocrural',        name: 'Ankle',              zoneId: 'calves',      front: [[256, 1195], [470, 1195]],      back: [[980, 1195], [1194, 1195]] },
  { id: 'subtalar',          name: 'Subtalar',           zoneId: 'calves',      front: [[256, 1220], [470, 1220]],      back: [[980, 1220], [1194, 1220]] },
]

interface TendonDef {
  id: string
  front?: [number, number][][]
  back?: [number, number][][]
}

const TENDONS: TendonDef[] = [
  { id: 'achilles',      back:  [[[978, 1175], [978, 1252]], [[1194, 1175], [1194, 1252]]] },
  { id: 'patellar',      front: [[[252, 936], [252, 990]], [[474, 936], [474, 990]]] },
  { id: 'itband',        front: [[[210, 658], [222, 955]], [[505, 658], [494, 955]]] },
  { id: 'prox-ham',      back:  [[[976, 645], [976, 682]], [[1198, 645], [1198, 682]]] },
  { id: 'supraspinatus', back:  [[[900, 298], [942, 318]], [[1272, 298], [1232, 318]]] },
  { id: 'acl-mcl',       front: [[[238, 940], [262, 990]], [[486, 940], [462, 990]]] },
  { id: 'plantar',       back:  [[[956, 1265], [978, 1348]], [[1170, 1265], [1192, 1348]]] },
]

interface FasciaDef {
  id: string
  color: string
  front?: string
  back?: string
}

const FASCIA_ZONES: FasciaDef[] = [
  {
    id: 'itband',
    color: '#60a5fa',
    front: 'M 205 660 L 228 660 L 235 958 L 212 958 Z  M 498 660 L 520 660 L 514 958 L 491 958 Z',
  },
  {
    id: 'thoracolumbar',
    color: '#f59e0b',
    back: 'M 904 582 L 1268 582 L 1255 728 L 917 728 Z',
  },
  {
    id: 'plantar',
    color: '#a855f7',
    back: 'M 955 1262 L 1004 1262 L 1006 1352 Q 985 1368 964 1352 Z  M 1170 1262 L 1219 1262 L 1221 1352 Q 1200 1368 1179 1352 Z',
  },
]

// ── Zone detail panel ──────────────────────────────────────────

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

function ZoneDetail({ data, score, onClose }: { data: ZoneData; score?: number; onClose: () => void }) {
  const [section, setSection] = useState<'anatomy' | 'strength' | 'mobility'>('anatomy')
  const COLORS = { anatomy: '#7eb8d4', strength: '#4ade80', mobility: '#fb923c' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.65rem', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: '0.5rem' }}>
        <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
          {data.name.toUpperCase()}
        </span>
        {score !== undefined
          ? <span style={{ fontSize: '0.72rem', fontWeight: 700, color: scoreColor(score), fontFamily: 'var(--font-mono)' }}>{score.toFixed(1)}/5</span>
          : <span style={{ fontSize: '0.62rem', color: 'var(--muted-hi)', fontFamily: 'var(--font-mono)' }}>not tested</span>
        }
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-hi)', fontSize: '1rem', cursor: 'pointer', padding: '0.15rem 0.3rem', lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['anatomy', 'strength', 'mobility'] as const).map(s => (
          <button key={s} onClick={() => setSection(s)} style={{
            flex: 1, padding: '0.38rem 0.2rem', fontSize: '0.58rem', letterSpacing: '0.06em',
            fontFamily: 'var(--font-mono)', background: 'none', border: 'none', cursor: 'pointer',
            color: section === s ? COLORS[s] : 'var(--muted-hi)',
            borderBottom: `2px solid ${section === s ? COLORS[s] : 'transparent'}`,
            marginBottom: -1,
          }}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.75rem 1rem' }}>
        {section === 'anatomy' && (
          <>
            <Group title="MUSCLES" items={data.muscles} />
            {data.joints.length > 0 && <Group title="JOINTS" items={data.joints} />}
            {data.tendons.length > 0 && <Group title="TENDONS & LIGAMENTS" items={data.tendons} />}
          </>
        )}
        {section === 'strength'  && <Group title="STRENGTH EXERCISES" items={data.strength} />}
        {section === 'mobility'  && <Group title="MOBILITY & STRETCHING" items={data.mobility} />}
      </div>
    </div>
  )
}

// ── Layer toggle config ────────────────────────────────────────

const LAYER_COLORS: Record<Layer, string> = {
  muscles: '#86efac',
  joints:  '#7eb8d4',
  tendons: '#fb923c',
  fascia:  '#c084fc',
}

const LAYER_LABELS: Record<Layer, string> = {
  muscles: 'MUSCLE',
  joints:  'JOINT',
  tendons: 'TEND',
  fascia:  'FASCIA',
}

function loadLayers(): Set<Layer> {
  try {
    const raw = localStorage.getItem('gym-tracker:layers')
    if (raw) return new Set<Layer>(JSON.parse(raw) as Layer[])
  } catch { /* ignore */ }
  return new Set<Layer>(['muscles'])
}

// ── Main BodyMap ───────────────────────────────────────────────

export default function BodyMap({ zoneScores }: { zoneScores: Record<string, number> }) {
  const { theme } = useTheme()
  const [view, setView] = useState<'front' | 'back'>('front')
  const [selectedSlug, setSelectedSlug] = useState<Slug | null>(null)
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [layers, setLayers] = useState<Set<Layer>>(loadLayers)

  const isDark = theme === 'dark'
  const bodyColor   = isDark ? '#152535' : '#c8dae8'
  const strokeColor = isDark ? '#2a4a66' : '#a0c0d8'
  const accentColor = isDark ? '#7eb8d4' : '#2a78b8'
  const hasSelection = !!activeZoneId

  const toggleLayer = (l: Layer) => {
    setLayers(prev => {
      const next = new Set(prev)
      if (next.has(l)) { next.delete(l) } else { next.add(l) }
      try { localStorage.setItem('gym-tracker:layers', JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  const handlePress = (bodyPart: ExtendedBodyPart) => {
    const slug = bodyPart.slug
    if (!slug) return
    const zoneId = SLUG_TO_ZONE[slug]
    if (!zoneId) return
    if (selectedSlug === slug) { setSelectedSlug(null); setActiveZoneId(null) }
    else { setSelectedSlug(slug); setActiveZoneId(zoneId) }
  }

  const close = () => { setSelectedSlug(null); setActiveZoneId(null) }

  // Muscle-layer highlight data: health colours + selected accent
  const highlightData: ExtendedBodyPart[] = []
  if (layers.has('muscles')) {
    for (const [zoneId, score] of Object.entries(zoneScores)) {
      for (const slug of (ZONE_TO_SLUGS[zoneId] ?? [])) {
        if (slug !== selectedSlug) {
          highlightData.push({ slug, intensity: Math.max(0, Math.min(4, Math.round(score) - 1)) })
        }
      }
    }
  }
  if (selectedSlug) highlightData.push({ slug: selectedSlug, color: accentColor })

  const scale = hasSelection ? 0.75 : 1.1
  const showOverlay = layers.has('joints') || layers.has('tendons') || layers.has('fascia')
  const vb = view === 'front' ? '0 0 724 1448' : '724 0 724 1448'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Controls: front/back + layer toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['front', 'back'] as const).map(v => (
          <button key={v} onClick={() => { setView(v); close() }} style={{
            padding: '0.22rem 0.65rem', fontSize: '0.62rem', letterSpacing: '0.08em',
            fontFamily: 'var(--font-mono)', fontWeight: view === v ? 700 : 400, cursor: 'pointer',
            background: view === v ? 'var(--accent)' : 'var(--surface)',
            color: view === v ? 'var(--accent-fg)' : 'var(--text2)',
            border: `1px solid ${view === v ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6,
          }}>
            {v.toUpperCase()}
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0, margin: '0 0.15rem' }} />

        {(['muscles', 'joints', 'tendons', 'fascia'] as Layer[]).map(l => {
          const on = layers.has(l)
          return (
            <button key={l} onClick={() => toggleLayer(l)} style={{
              padding: '0.22rem 0.55rem', fontSize: '0.6rem', letterSpacing: '0.06em',
              fontFamily: 'var(--font-mono)', cursor: 'pointer', borderRadius: 6,
              background: on ? `${LAYER_COLORS[l]}22` : 'transparent',
              color: on ? LAYER_COLORS[l] : 'var(--muted-hi)',
              border: `1px solid ${on ? LAYER_COLORS[l] : 'var(--border)'}`,
            }}>
              {LAYER_LABELS[l]}
            </button>
          )
        })}
      </div>

      {/* Split layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Body figure pane */}
        <div style={{
          flexShrink: 0,
          width: hasSelection ? '42%' : '100%',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          padding: hasSelection ? '0.25rem 0.25rem 0.5rem' : '0.5rem 2rem 0.5rem',
        }}>
          {/* Wrapper for overlay alignment */}
          <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
            <Body
              data={highlightData}
              colors={HEALTH_COLORS}
              side={view}
              gender="male"
              defaultFill={bodyColor}
              defaultStroke={strokeColor}
              defaultStrokeWidth={0.8}
              onBodyPartPress={handlePress}
              scale={scale}
            />

            {showOverlay && (
              <svg
                viewBox={vb}
                preserveAspectRatio="xMidYMid meet"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              >
                {/* Fascia layer — translucent region shapes */}
                {layers.has('fascia') && FASCIA_ZONES.map(f => {
                  const d = view === 'front' ? f.front : f.back
                  if (!d) return null
                  return <path key={f.id} d={d} fill={f.color} fillOpacity={0.22} stroke={f.color} strokeWidth={3} strokeOpacity={0.55} />
                })}

                {/* Tendon layer — lines at key anatomical positions */}
                {layers.has('tendons') && TENDONS.map(t => {
                  const segs = view === 'front' ? t.front : t.back
                  if (!segs) return null
                  return segs.map(([[x1, y1], [x2, y2]], i) => (
                    <line key={`${t.id}-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="#fb923c" strokeWidth={9} strokeLinecap="round" opacity={0.82} />
                  ))
                })}

                {/* Joint layer — coloured circles */}
                {layers.has('joints') && JOINTS.map(j => {
                  const pts = view === 'front' ? j.front : j.back
                  if (!pts) return null
                  const score = j.zoneId ? zoneScores[j.zoneId] : undefined
                  const fill = score !== undefined ? scoreColor(score) : '#7eb8d4'
                  return pts.map(([cx, cy], i) => (
                    <circle key={`${j.id}-${i}`} cx={cx} cy={cy} r={16}
                      fill={fill} fillOpacity={0.88} stroke="rgba(255,255,255,0.4)" strokeWidth={3} />
                  ))
                })}
              </svg>
            )}
          </div>

          <p style={{ fontSize: '0.6rem', color: hasSelection ? accentColor : 'var(--muted-hi)', letterSpacing: '0.05em', marginTop: '0.3rem', textAlign: 'center' }}>
            {hasSelection && activeZoneId
              ? ZONE_DATA[activeZoneId]?.name.toUpperCase()
              : 'TAP A MUSCLE'}
          </p>
        </div>

        {/* Content pane — slides in on tap */}
        <div style={{
          flexShrink: 0,
          width: hasSelection ? '58%' : '0%',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          borderLeft: hasSelection ? '1px solid var(--border)' : 'none',
          background: 'var(--bg2)',
        }}>
          {activeZoneId && ZONE_DATA[activeZoneId] && (
            <ZoneDetail data={ZONE_DATA[activeZoneId]} score={zoneScores[activeZoneId]} onClose={close} />
          )}
        </div>
      </div>
    </div>
  )
}
