import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeaderRight } from './HeaderRight'
import { supabase } from './supabase'

interface Lesson {
  id: number
  chapter: string
  chapter_title: string
}

type PdfFont = 'serif' | 'sans' | 'mono'
const FONT_LABELS: Record<PdfFont, string> = { serif: 'Serif', sans: 'Sans', mono: 'Ubuntu Mono' }

function pdfUrl(chapter: string, font: PdfFont) {
  return `/pdfs/cpp-chapter-${chapter.padStart(2, '0')}-${font}.pdf`
}

export default function CppNotes() {
  const navigate = useNavigate()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfFont, setPdfFont] = useState<PdfFont>(
    () => (localStorage.getItem('cpp-pdf-font') as PdfFont) ?? 'sans'
  )
  const [pdfAvailable, setPdfAvailable] = useState<Record<string, boolean | undefined>>({})

  function setFont(f: PdfFont) {
    setPdfFont(f)
    localStorage.setItem('cpp-pdf-font', f)
  }

  useEffect(() => {
    supabase
      .from('cpp_lessons')
      .select('id, chapter, chapter_title')
      .order('chapter', { ascending: true })
      .then(({ data }) => {
        setLessons(data ?? [])
        setLoading(false)
      })
  }, [])

  const chapters: [string, string][] = useMemo(
    () => [
      ...new Map(lessons.map(l => [l.chapter, l.chapter_title] as [string, string]))
    ].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
    [lessons]
  )

  // Check which chapters have a PDF available for the current font
  useEffect(() => {
    if (chapters.length === 0) return
    setPdfAvailable({})
    chapters.forEach(([ch]) => {
      fetch(pdfUrl(ch, pdfFont), { method: 'HEAD' })
        .then(r => {
          const ct = r.headers.get('Content-Type') ?? ''
          setPdfAvailable(prev => ({ ...prev, [ch]: ct.includes('pdf') }))
        })
        .catch(() => setPdfAvailable(prev => ({ ...prev, [ch]: false })))
    })
  }, [chapters, pdfFont])

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">C++ Notes</span>
        </div>
        <HeaderRight options={close => (
          <>
            <button className="header-toast-item" onClick={() => { close(); navigate('/cpp-ch1') }}>
              Open Quiz
            </button>
            <div className="header-toast-item" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem', marginBottom: '0.1rem' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>PDF FONT</div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {(Object.keys(FONT_LABELS) as PdfFont[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFont(f)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                      background: pdfFont === f ? 'var(--accent)' : 'var(--surface)',
                      color: pdfFont === f ? 'var(--bg)' : 'var(--text)',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                    }}
                  >
                    {FONT_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )} />
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem' }}>
          Loading…
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {chapters.map(([ch, title]) => {
            const available = pdfAvailable[ch]
            const greyed = available === false
            return (
              <div
                key={ch}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border)',
                  padding: '0.85rem 1rem',
                  opacity: greyed ? 0.4 : 1,
                }}
              >
                <div>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--accent)',
                  }}>
                    Ch.{ch}
                  </span>
                  {' '}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    color: 'var(--text)',
                  }}>
                    {title}
                  </span>
                </div>
                {available === undefined ? (
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>…</span>
                ) : available ? (
                  <a
                    href={pdfUrl(ch, pdfFont)}
                    download
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      border: '1px solid var(--accent)',
                      borderRadius: 4,
                      padding: '3px 10px',
                      flexShrink: 0,
                    }}
                  >
                    ⬇ PDF
                  </a>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
