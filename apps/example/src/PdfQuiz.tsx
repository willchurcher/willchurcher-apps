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

  const fileRef    = useRef<HTMLInputElement>(null)
  const viewerRef  = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Keep committed scale in a ref so touch callbacks always see the latest value
  const committedScale = useRef(1.0)

  const [viewerWidth, setViewerWidth] = useState(window.innerWidth)

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setViewerWidth(e.contentRect.width))
    if (viewerRef.current) obs.observe(viewerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const viewer  = viewerRef.current
    const content = contentRef.current
    if (!viewer || !content) return

    // iOS Safari fires its own GestureEvent for pinch — block it so our
    // touch handler is the only thing responding to two-finger gestures.
    const blockGesture = (e: Event) => e.preventDefault()
    document.addEventListener('gesturestart',  blockGesture, { passive: false })
    document.addEventListener('gesturechange', blockGesture, { passive: false })

    let startDist  = 0
    let startMidX  = 0   // client-space midpoint of the two fingers
    let startMidY  = 0
    let pinchRatio = 1.0  // ratio relative to committedScale

    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length < 2) return
      startDist  = dist(e.touches)
      startMidX  = (e.touches[0].clientX + e.touches[1].clientX) / 2
      startMidY  = (e.touches[0].clientY + e.touches[1].clientY) / 2
      pinchRatio = 1.0
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startDist <= 0 || e.touches.length < 2) return
      e.preventDefault()

      const rawRatio = dist(e.touches) / startDist
      const total    = committedScale.current * rawRatio
      pinchRatio     = Math.max(0.3, Math.min(3.0, total)) / committedScale.current

      // Transform origin = pinch midpoint in content-element coordinates
      const rect    = viewer.getBoundingClientRect()
      const originX = (startMidX - rect.left) + viewer.scrollLeft
      const originY = (startMidY - rect.top)  + viewer.scrollTop

      content.style.transformOrigin = `${originX}px ${originY}px`
      content.style.transform       = `scale(${pinchRatio})`
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (startDist <= 0 || e.touches.length >= 2) return

      // Clear the CSS transform
      content.style.transform       = ''
      content.style.transformOrigin = ''

      // Shift scroll so the pinch centre stays under the user's fingers
      const rect = viewer.getBoundingClientRect()
      viewer.scrollLeft += (startMidX - rect.left) * (pinchRatio - 1)
      viewer.scrollTop  += (startMidY - rect.top)  * (pinchRatio - 1)

      // Commit → react-pdf re-renders canvases at new pixel width (crisp)
      const newScale = Math.max(0.3, Math.min(3.0, committedScale.current * pinchRatio))
      committedScale.current = newScale
      setRenderScale(newScale)

      startDist  = 0
      pinchRatio = 1.0
    }

    viewer.addEventListener('touchstart', onTouchStart, { passive: true  })
    viewer.addEventListener('touchmove',  onTouchMove,  { passive: false })
    viewer.addEventListener('touchend',   onTouchEnd,   { passive: true  })

    return () => {
      viewer.removeEventListener('touchstart', onTouchStart)
      viewer.removeEventListener('touchmove',  onTouchMove)
      viewer.removeEventListener('touchend',   onTouchEnd)
      document.removeEventListener('gesturestart',  blockGesture)
      document.removeEventListener('gesturechange', blockGesture)
    }
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
                    width={viewerWidth * renderScale}
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
