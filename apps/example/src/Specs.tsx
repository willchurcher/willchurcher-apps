import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Marked } from 'marked'
import { HeaderRight } from './HeaderRight'

// ── Spec registry ──────────────────────────────────────────────────────────────

const SPECS = [
  { key: 'global-styles', label: 'Global Styles', icon: '🎨' },
  { key: 'pdf-viewer',    label: 'PDF Viewer',    icon: '📄' },
  { key: 'research',      label: 'Research',      icon: '🔬' },
]

// ── Settings ───────────────────────────────────────────────────────────────────

interface SpecsSettings {
  // Typography (sliders)
  fontSize:       number   // rem  e.g. 0.88
  lineHeight:     number   // unitless e.g. 1.65
  sidePadding:    number   // rem  e.g. 1.0
  h1Size:         number   // rem  e.g. 1.80
  h2Size:         number   // rem  e.g. 1.05
  h3Size:         number   // rem  e.g. 0.92
  paragraphGap:   number   // rem  e.g. 0.75
  listIndent:     number   // rem  e.g. 1.40
  // Marked options (toggles)
  gfm:            boolean  // GitHub Flavored Markdown (tables, strikethrough)
  breaks:         boolean  // single newlines → <br>
  linksNewTab:    boolean  // open links in new tab
  showHr:         boolean  // show <hr> dividers
  headingAnchors: boolean  // add # anchor links to headings
}

const DEFAULTS: SpecsSettings = {
  fontSize:       0.88,
  lineHeight:     1.65,
  sidePadding:    1.00,
  h1Size:         1.80,
  h2Size:         1.05,
  h3Size:         0.92,
  paragraphGap:   0.75,
  listIndent:     1.40,
  gfm:            true,
  breaks:         false,
  linksNewTab:    true,
  showHr:         false,
  headingAnchors: false,
}

const SETTINGS_KEY = 'specs-settings'

function loadSettings(): SpecsSettings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') } }
  catch { return DEFAULTS }
}

// ── Markdown parser (per-render instance so settings apply immediately) ─────────

function parseMarkdown(text: string, s: SpecsSettings): string {
  let html = new Marked({ gfm: s.gfm, breaks: s.breaks }).parse(text) as string

  // Post-process HTML rather than fighting the renderer's `this` typing
  if (!s.showHr) {
    html = html.replace(/<hr\s*\/?>/gi, '')
  }
  if (s.linksNewTab) {
    html = html.replace(/<a\s+href=/gi, '<a target="_blank" rel="noreferrer" href=')
  }
  if (s.headingAnchors) {
    html = html.replace(/<h([2-6])>([\s\S]*?)<\/h\1>/g, (_m, depth: string, content: string) => {
      const id = content.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return `<h${depth} id="${id}">${content} <a class="specs-anchor" href="#${id}">#</a></h${depth}>`
    })
  }

  return html
}

// ── Options panel ──────────────────────────────────────────────────────────────

type NumericKey = 'fontSize' | 'lineHeight' | 'sidePadding' | 'h1Size' | 'h2Size' | 'h3Size' | 'paragraphGap' | 'listIndent'
type BooleanKey = 'gfm' | 'breaks' | 'linksNewTab' | 'showHr' | 'headingAnchors'

const SLIDERS: { key: NumericKey; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: 'fontSize',     label: 'Body font size', min: 0.68, max: 1.20, step: 0.01, unit: 'rem' },
  { key: 'lineHeight',   label: 'Line height',    min: 1.10, max: 2.20, step: 0.05, unit: ''    },
  { key: 'sidePadding',  label: 'Side margin',    min: 0.00, max: 2.50, step: 0.05, unit: 'rem' },
  { key: 'h1Size',       label: 'H1 size',        min: 1.20, max: 2.80, step: 0.05, unit: 'rem' },
  { key: 'h2Size',       label: 'H2 size',        min: 0.82, max: 1.60, step: 0.05, unit: 'rem' },
  { key: 'h3Size',       label: 'H3 size',        min: 0.75, max: 1.40, step: 0.05, unit: 'rem' },
  { key: 'paragraphGap', label: 'Paragraph gap',  min: 0.10, max: 1.50, step: 0.05, unit: 'rem' },
  { key: 'listIndent',   label: 'List indent',    min: 0.50, max: 3.00, step: 0.10, unit: 'rem' },
]

const TOGGLES: { key: BooleanKey; label: string; description: string }[] = [
  { key: 'gfm',            label: 'GFM',           description: 'Tables, strikethrough, task lists' },
  { key: 'breaks',         label: 'Line breaks',   description: 'Single newline → <br>' },
  { key: 'linksNewTab',    label: 'Links new tab', description: 'Open all links in new tab' },
  { key: 'showHr',         label: 'Dividers',      description: 'Show — horizontal rules' },
  { key: 'headingAnchors', label: 'Anchors',       description: 'Add # links to headings' },
]

function SpecsOptions({ settings, onChange, onSave, onReset }: {
  settings: SpecsSettings
  onChange: (s: SpecsSettings) => void
  onSave:   () => void
  onReset:  () => void
}) {
  return (
    <div className="specs-options-panel">
      <div className="specs-section-label">Typography</div>
      {SLIDERS.map(s => (
        <div key={s.key} className="specs-slider-row">
          <div className="specs-slider-header">
            <span className="specs-slider-label">{s.label}</span>
            <span className="specs-slider-value">{settings[s.key].toFixed(2)}{s.unit}</span>
          </div>
          <input
            type="range"
            className="specs-slider"
            min={s.min} max={s.max} step={s.step}
            value={settings[s.key]}
            onChange={e => onChange({ ...settings, [s.key]: Number(e.target.value) })}
          />
        </div>
      ))}

      <div className="specs-section-label">Markdown</div>
      {TOGGLES.map(t => (
        <div key={t.key} className="specs-toggle-row">
          <div className="specs-toggle-text">
            <span className="specs-slider-label">{t.label}</span>
            <span className="specs-toggle-desc">{t.description}</span>
          </div>
          <button
            className={`specs-toggle-btn ${settings[t.key] ? 'specs-toggle-on' : ''}`}
            onClick={() => onChange({ ...settings, [t.key]: !settings[t.key] })}
          >
            {settings[t.key] ? 'On' : 'Off'}
          </button>
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

  const [rawText,   setRawText]   = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [settings,  setSettings]  = useState<SpecsSettings>(loadSettings)
  const [saved,     setSaved]     = useState(false)

  useEffect(() => {
    if (!selected) { setRawText(null); setLoadError(false); return }
    setRawText(null)
    setLoadError(false)
    fetch(`/specs/${selected.key}.md`)
      .then(r => { if (!r.ok) throw new Error(); return r.text() })
      .then(text => setRawText(text))
      .catch(() => setLoadError(true))
  }, [selected?.key])

  // Re-parse whenever raw text or any setting changes
  const markdown = useMemo(
    () => rawText ? parseMarkdown(rawText, settings) : null,
    [rawText, settings],
  )

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

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
            onReset={() => setSettings(DEFAULTS)}
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
