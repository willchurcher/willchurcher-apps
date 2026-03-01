import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { marked } from 'marked'
import { HeaderRight } from './HeaderRight'

// Suppress <hr> in rendered markdown
marked.use({ renderer: { hr: () => '' } })

// ── Spec registry ──────────────────────────────────────────────────────────────

const SPECS = [
  { key: 'global-styles', label: 'Global Styles', icon: '🎨' },
  { key: 'pdf-viewer',    label: 'PDF Viewer',    icon: '📄' },
  { key: 'research',      label: 'Research',      icon: '🔬' },
]

// ── Typography settings ────────────────────────────────────────────────────────

interface SpecsSettings {
  fontSize:   'sm' | 'md' | 'lg'
  lineHeight: 'compact' | 'normal' | 'relaxed'
  margin:     'tight' | 'normal' | 'wide'
}

const DEFAULTS: SpecsSettings = { fontSize: 'md', lineHeight: 'normal', margin: 'normal' }
const SETTINGS_KEY = 'specs-settings'

const FONT_SIZES   = { sm: '0.78rem', md: '0.88rem',  lg: '1.0rem'  }
const LINE_HEIGHTS = { compact: '1.4', normal: '1.65', relaxed: '1.9' }
const MARGINS      = { tight: '0.5rem 0.75rem', normal: '1rem 1.25rem', wide: '1.5rem 2.5rem' }

function loadSettings(): SpecsSettings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') } }
  catch { return DEFAULTS }
}

// ── Options panel ──────────────────────────────────────────────────────────────

function SpecsOptions({ settings, onChange, onSave }: {
  settings: SpecsSettings
  onChange: (s: SpecsSettings) => void
  onSave:   () => void
}) {
  function ToggleRow<K extends keyof SpecsSettings>({ label, field, options }: {
    label:   string
    field:   K
    options: { value: SpecsSettings[K]; label: string }[]
  }) {
    return (
      <div className="specs-opt-row">
        <span className="specs-opt-label">{label}</span>
        <div className="specs-opt-btns">
          {options.map(o => (
            <button
              key={String(o.value)}
              className={`btn specs-opt-btn ${settings[field] === o.value ? 'specs-opt-active' : ''}`}
              onClick={() => onChange({ ...settings, [field]: o.value })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="specs-options-panel">
      <ToggleRow
        label="Font size" field="fontSize"
        options={[{ value: 'sm', label: 'S' }, { value: 'md', label: 'M' }, { value: 'lg', label: 'L' }]}
      />
      <ToggleRow
        label="Spacing" field="lineHeight"
        options={[{ value: 'compact', label: 'Tight' }, { value: 'normal', label: 'Normal' }, { value: 'relaxed', label: 'Open' }]}
      />
      <ToggleRow
        label="Margin" field="margin"
        options={[{ value: 'tight', label: 'Tight' }, { value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Wide' }]}
      />
      <button className="btn btn-primary specs-save-btn" onClick={onSave}>
        Save as default
      </button>
    </div>
  )
}

// ── Specs page ─────────────────────────────────────────────────────────────────

export default function Specs() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedKey = searchParams.get('file')
  const selected    = SPECS.find(s => s.key === selectedKey) ?? null

  const [markdown,  setMarkdown]  = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [settings,  setSettings]  = useState<SpecsSettings>(loadSettings)
  const [saved,     setSaved]     = useState(false)

  useEffect(() => {
    if (!selected) { setMarkdown(null); setLoadError(false); return }
    setMarkdown(null)
    setLoadError(false)
    fetch(`/specs/${selected.key}.md`)
      .then(r => { if (!r.ok) throw new Error(); return r.text() })
      .then(text => setMarkdown(marked(text) as string))
      .catch(() => setLoadError(true))
  }, [selected?.key])

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const contentStyle: React.CSSProperties = {
    padding:      MARGINS[settings.margin],
    fontSize:     FONT_SIZES[settings.fontSize],
    lineHeight:   LINE_HEIGHTS[settings.lineHeight],
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          {selected ? (
            <button className="back-btn" onClick={() => setSearchParams({})}>‹ Specs</button>
          ) : (
            <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          )}
          <span className="page-header-title">{selected?.label ?? 'Specs'}</span>
        </div>
        <HeaderRight options={() => (
          <SpecsOptions
            settings={settings}
            onChange={setSettings}
            onSave={handleSave}
          />
        )} />
      </header>

      {saved && <div className="specs-saved-toast">Saved as default</div>}

      <div className="page-body specs-page">
        {selected ? (
          <div className="specs-content" style={contentStyle}>
            {loadError && <p className="specs-error">Failed to load spec.</p>}
            {!markdown && !loadError && <p className="specs-loading">Loading…</p>}
            {markdown && (
              <div
                className="specs-markdown"
                dangerouslySetInnerHTML={{ __html: markdown }}
              />
            )}
          </div>
        ) : (
          <div className="specs-list">
            {SPECS.map(spec => (
              <button
                key={spec.key}
                className="card specs-card"
                onClick={() => setSearchParams({ file: spec.key })}
              >
                <span className="specs-card-icon">{spec.icon}</span>
                <span className="specs-card-label">{spec.label}</span>
                <span className="specs-card-arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
