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

const SCALES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

export default function PdfQuiz() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  const [file, setFile]       = useState<File | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage]       = useState(1)
  const [scaleIdx, setScaleIdx] = useState(2) // default 1.0×

  const fileRef    = useRef<HTMLInputElement>(null)
  const viewerRef  = useRef<HTMLDivElement>(null)
  const [viewerWidth, setViewerWidth] = useState(window.innerWidth)

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setViewerWidth(e.contentRect.width))
    if (viewerRef.current) obs.observe(viewerRef.current)
    return () => obs.disconnect()
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setPage(1); setNumPages(0) }
  }

  const goTo = (p: number) => {
    setPage(p)
    viewerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }

  const scale = SCALES[scaleIdx]
  const pageWidth = viewerWidth * scale

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
            <Page
              pageNumber={page}
              width={pageWidth}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
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
        <button className="pdfquiz-bar-btn" onClick={() => fileRef.current?.click()} title="Open PDF">
          📄
        </button>
        <button
          className="pdfquiz-bar-btn"
          onClick={() => goTo(Math.max(1, page - 1))}
          disabled={page <= 1 || !file}
        >
          ‹
        </button>
        <span className="pdfquiz-page-count">
          {file ? `${page} / ${numPages || '…'}` : '—'}
        </span>
        <button
          className="pdfquiz-bar-btn"
          onClick={() => goTo(Math.min(numPages, page + 1))}
          disabled={page >= numPages || !file}
        >
          ›
        </button>
        <button
          className="pdfquiz-bar-btn"
          onClick={() => setScaleIdx(i => Math.max(0, i - 1))}
          disabled={scaleIdx === 0}
        >
          −
        </button>
        <span className="pdfquiz-zoom-label">{Math.round(scale * 100)}%</span>
        <button
          className="pdfquiz-bar-btn"
          onClick={() => setScaleIdx(i => Math.min(SCALES.length - 1, i + 1))}
          disabled={scaleIdx === SCALES.length - 1}
        >
          +
        </button>
      </div>
    </div>
  )
}
