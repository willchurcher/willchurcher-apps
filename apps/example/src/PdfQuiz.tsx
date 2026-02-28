import { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useNavigate } from 'react-router-dom'
import { useTheme } from './ThemeContext'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export default function PdfQuiz() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  const [file, setFile]         = useState<File | null>(null)
  const [numPages, setNumPages] = useState(0)

  const fileRef   = useRef<HTMLInputElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const [viewerWidth, setViewerWidth] = useState(window.innerWidth)

  // Allow pinch-to-zoom while on this page; restore on leave
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    const original = meta?.getAttribute('content') ?? ''
    meta?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes')
    return () => { meta?.setAttribute('content', original) }
  }, [])

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setViewerWidth(e.contentRect.width))
    if (viewerRef.current) obs.observe(viewerRef.current)
    return () => obs.disconnect()
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setNumPages(0) }
  }

  return (
    <div className="pdfquiz-page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">PDF Viewer</span>
        </div>
        <button className="theme-toggle" onClick={toggle}>
          {theme === 'dark' ? '☀ light' : '◑ dark'}
        </button>
      </header>

      <div className="pdfquiz-viewer" ref={viewerRef}>
        {!file ? (
          <div className="pdfquiz-placeholder" onClick={() => fileRef.current?.click()}>
            <span className="pdfquiz-placeholder-icon">📄</span>
            <span>Tap to open a PDF</span>
          </div>
        ) : (
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div className="pdfquiz-loading">Loading…</div>}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="pdfquiz-page-wrap">
                <Page
                  pageNumber={i + 1}
                  width={viewerWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={true}
                />
              </div>
            ))}
          </Document>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />

      <div className="pdfquiz-bar">
        <button className="pdfquiz-bar-btn" onClick={() => fileRef.current?.click()}>
          📄
        </button>
        {numPages > 0 && (
          <span className="pdfquiz-page-count">{numPages} pages</span>
        )}
      </div>
    </div>
  )
}
