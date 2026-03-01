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
  fontSize:     number   // rem  e.g. 0.88
  lineHeight:   number   // unitless e.g. 1.65
  sidePadding:  number   // rem  e.g. 1.0  (left + right margin from screen edge)
  h1Size:       number   // rem  e.g. 1.80
  h2Size:       number   // rem  e.g. 1.05
  h3Size:       number   // rem  e.g. 0.92
  paragraphGap: number   // rem  e.g. 0.75 (space after p / list block)
  listIndent:   number   // rem  e.g. 1.40 (ul/ol padding-left)
}

const DEFAULTS: SpecsSettings = {
  fontSize:     0.88,
  lineHeight:   1.65,
  sidePadding:  1.00,
  h1Size:       1.80,
  h2Size:       1.05,
  h3Size:       0.92,
  paragraphGap: 0.75,
  listIndent:   1.40,
}

const SETTINGS_KEY = 'specs-settings'

function loadSettings(): SpecsSettings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') } }
  catch { return DEFAULTS }
}

// ── Options panel ──────────────────────────────────────────────────────────────

const SLIDERS: {
  key:   keyof SpecsSettings
  label: string
  min:   number
  max:   number
  step:  number
  unit:  string
}[] = [
  { key: 'fontSize',     label: 'Body font size',   min: 0.68, max: 1.20, step: 0.01, unit: 'rem' },
  { key: 'lineHeight',   label: 'Line height',       min: 1.10, max: 2.20, step: 0.05, unit: ''    },
  { key: 'sidePadding',  label: 'Side margin',       min: 0.00, max: 2.50, step: 0.05, unit: 'rem' },
  { key: 'h1Size',       label: 'H1 size',           min: 1.20, max: 2.80, step: 0.05, unit: 'rem' },
  { key: 'h2Size',       label: 'H2 size',           min: 0.82, max: 1.60, step: 0.05, unit: 'rem' },
  { key: 'h3Size',       label: 'H3 size',           min: 0.75, max: 1.40, step: 0.05, unit: 'rem' },
  { key: 'paragraphGap', label: 'Paragraph gap',     min: 0.10, max: 1.50, step: 0.05, unit: 'rem' },
  { key: 'listIndent',   label: 'List indent',       min: 0.50, max: 3.00, step: 0.10, unit: 'rem' },
]

function SpecsOptions({ settings, onChange, onSave, onReset }: {
  settings: SpecsSettings
  onChange: (s: SpecsSettings) => void
  onSave:   () => void
  onReset:  () => void
}) {
  return (
    <div className="specs-options-panel">
      {SLIDERS.map(s => (
        <div key={s.key} className="specs-slider-row">
          <div className="specs-slider-header">
            <span className="specs-slider-label">{s.label}</span>
            <span className="specs-slider-value">
              {settings[s.key].toFixed(s.step < 0.05 ? 2 : 2)}{s.unit}
            </span>
          </div>
          <input
            type="range"
            className="specs-slider"
            min={s.min}
            max={s.max}
            step={s.step}
            value={settings[s.key]}
            onChange={e => onChange({ ...settings, [s.key]: Number(e.target.value) })}
          />
        </div>
      ))}
      <div className="specs-options-actions">
        <button className="btn specs-opt-action-btn" onClick={onReset}>Reset</button>
        <button className="btn btn-primary specs-opt-action-btn" onClick={onSave}>Save as default</button>
      </div>
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

  const handleReset = () => setSettings(DEFAULTS)

  // CSS custom properties applied to the content wrapper
  const contentVars = {
    '--sm-fs':   `${settings.fontSize}rem`,
    '--sm-lh':   `${settings.lineHeight}`,
    '--sm-side': `${settings.sidePadding}rem`,
    '--sm-h1':   `${settings.h1Size}rem`,
    '--sm-h2':   `${settings.h2Size}rem`,
    '--sm-h3':   `${settings.h3Size}rem`,
    '--sm-pg':   `${settings.paragraphGap}rem`,
    '--sm-li':   `${settings.listIndent}rem`,
  } as React.CSSProperties

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
            onReset={handleReset}
          />
        )} />
      </header>

      {saved && <div className="specs-saved-toast">Saved as default</div>}

      <div className="page-body specs-page">
        {selected ? (
          <div className="specs-content" style={contentVars}>
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
