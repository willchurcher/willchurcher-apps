import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { marked } from 'marked'
import { HeaderRight } from './HeaderRight'

// ── Spec registry ──────────────────────────────────────────────────────────────

const SPECS = [
  { key: 'global-styles', label: 'Global Styles', icon: '🎨' },
  { key: 'pdf-viewer',    label: 'PDF Viewer',    icon: '📄' },
  { key: 'research',      label: 'Research',      icon: '🔬' },
]

// ── Specs page ─────────────────────────────────────────────────────────────────

export default function Specs() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedKey = searchParams.get('file')
  const selected    = SPECS.find(s => s.key === selectedKey) ?? null

  const [markdown, setMarkdown]   = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!selected) { setMarkdown(null); setLoadError(false); return }
    setMarkdown(null)
    setLoadError(false)
    fetch(`/specs/${selected.key}.md`)
      .then(r => { if (!r.ok) throw new Error(); return r.text() })
      .then(text => setMarkdown(marked(text) as string))
      .catch(() => setLoadError(true))
  }, [selected?.key])

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
        <HeaderRight />
      </header>

      <div className="page-body specs-page">
        {selected ? (
          <div className="specs-content">
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
