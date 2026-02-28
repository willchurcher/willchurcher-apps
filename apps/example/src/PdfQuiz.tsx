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
  const [renderScale, setRenderScale] = useState(1.0)

  const fileRef      = useRef<HTMLInputElement>(null)
  const viewerRef    = useRef<HTMLDivElement>(null)
  const contentRef   = useRef<HTMLDivElement>(null)
  const committedScale = useRef(1.0)

  const [viewerWidth, setViewerWidth] = useState(window.innerWidth)

  // Restore maximum-scale=1 (we handle pinch ourselves)
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    const original = meta?.getAttribute('content') ?? ''
    meta?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1')
    return () => { meta?.setAttribute('content', original) }
  }, [])

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setViewerWidth(e.contentRect.width))
    if (viewerRef.current) obs.observe(viewerRef.current)
    return () => obs.disconnect()
  }, [])

  // Custom pinch-to-zoom: CSS transform during gesture, re-render on release
  useEffect(() => {
    const viewer = viewerRef.current
    const content = contentRef.current
    if (!viewer || !content) return

    let pinching = false
    let startDist = 0
    let gestureRatio = 1.0

    const getDist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinching = true
        startDist = getDist(e.touches)
        gestureRatio = 1.0
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pinching || e.touches.length !== 2) return
      e.preventDefault()
      gestureRatio = getDist(e.touches) / startDist
      // clamp so we don't go below 0.5× or above 4× total
      const total = committedScale.current * gestureRatio
      gestureRatio = Math.max(0.5, Math.min(4.0, total)) / committedScale.current
      content.style.transform = `scale(${gestureRatio})`
      content.style.transformOrigin = 'top center'
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!pinching || e.touches.length >= 2) return
      pinching = false
      const newScale = Math.max(0.5, Math.min(4.0, committedScale.current * gestureRatio))
      // Save fractional scroll position so we can restore it after re-render
      const fraction = viewer.scrollTop / (viewer.scrollHeight || 1)
      committedScale.current = newScale
      content.style.transform = ''
      content.style.transformOrigin = ''
      setRenderScale(newScale)
      // Restore scroll after paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          viewer.scrollTop = fraction * viewer.scrollHeight
        })
      })
    }

    viewer.addEventListener('touchstart', onTouchStart, { passive: true })
    viewer.addEventListener('touchmove', onTouchMove, { passive: false })
    viewer.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      viewer.removeEventListener('touchstart', onTouchStart)
      viewer.removeEventListener('touchmove', onTouchMove)
      viewer.removeEventListener('touchend', onTouchEnd)
    }
  }, []) // refs are stable, no deps needed

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setNumPages(0) }
  }

  const pageWidth = viewerWidth * renderScale

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
        <div ref={contentRef} className="pdfquiz-content">
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
                    width={pageWidth}
                    renderAnnotationLayer={false}
                    renderTextLayer={true}
                  />
                </div>
              ))}
            </Document>
          )}
        </div>
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
