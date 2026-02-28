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

  const [file, setFile]           = useState<File | null>(null)
  const [numPages, setNumPages]   = useState(0)
  const [renderScale, setRenderScale] = useState(1.0)

  const fileRef        = useRef<HTMLInputElement>(null)
  const viewerRef      = useRef<HTMLDivElement>(null)
  const contentRef     = useRef<HTMLDivElement>(null)
  const committedScale = useRef(1.0)
  const pendingScroll  = useRef<{ left: number; top: number } | null>(null)

  const [viewerWidth, setViewerWidth] = useState(window.innerWidth)

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setViewerWidth(e.contentRect.width))
    if (viewerRef.current) obs.observe(viewerRef.current)
    return () => obs.disconnect()
  }, [])

  // Apply the scroll correction AFTER the re-render has updated the DOM dimensions
  useEffect(() => {
    const target = pendingScroll.current
    if (!target || !viewerRef.current) return
    pendingScroll.current = null
    requestAnimationFrame(() => {
      if (!viewerRef.current) return
      viewerRef.current.scrollLeft = target.left
      viewerRef.current.scrollTop  = target.top
    })
  }, [renderScale])

  useEffect(() => {
    const viewer  = viewerRef.current
    const content = contentRef.current
    if (!viewer || !content) return

    // iOS Safari fires proprietary GestureEvents for pinch — block them so
    // our touchmove handler is the sole responder to two-finger gestures.
    const blockGesture = (e: Event) => e.preventDefault()
    document.addEventListener('gesturestart',  blockGesture, { passive: false })
    document.addEventListener('gesturechange', blockGesture, { passive: false })

    let startDist  = 0
    let startMidX  = 0   // viewport-space midpoint of the two fingers at gesture start
    let startMidY  = 0
    let pinchRatio = 1.0  // CSS-transform ratio applied on top of committedScale

    const getDist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length < 2) return
      startDist  = getDist(e.touches)
      startMidX  = (e.touches[0].clientX + e.touches[1].clientX) / 2
      startMidY  = (e.touches[0].clientY + e.touches[1].clientY) / 2
      pinchRatio = 1.0
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startDist <= 0 || e.touches.length < 2) return
      e.preventDefault()

      const rawRatio = getDist(e.touches) / startDist
      const total    = committedScale.current * rawRatio
      // Clamp the total scale; back-calculate pinchRatio from that
      pinchRatio = Math.max(1.0, Math.min(3.0, total)) / committedScale.current

      // Transform origin = pinch midpoint in content-local coordinates
      // (viewport offset relative to viewer's left/top, plus the current scroll)
      const rect    = viewer.getBoundingClientRect()
      const originX = (startMidX - rect.left) + viewer.scrollLeft
      const originY = (startMidY - rect.top)  + viewer.scrollTop

      content.style.transformOrigin = `${originX}px ${originY}px`
      content.style.transform       = `scale(${pinchRatio})`
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (startDist <= 0 || e.touches.length >= 2) return

      const rect = viewer.getBoundingClientRect()
      // Pinch centre in viewport space (relative to viewer's top-left corner)
      const cx = startMidX - rect.left
      const cy = startMidY - rect.top

      // Correct scroll formula so the pinch centre stays at the same screen position.
      // Derivation: content point at content-coord (scrollLeft + cx) maps to
      // (scrollLeft + cx) * ratio after zoom; subtract cx to get new scrollLeft.
      const targetLeft = viewer.scrollLeft * pinchRatio + cx * (pinchRatio - 1)
      const targetTop  = viewer.scrollTop  * pinchRatio + cy * (pinchRatio - 1)

      // Clear the visual-only CSS transform
      content.style.transform       = ''
      content.style.transformOrigin = ''

      // Commit scale → react-pdf re-renders canvases at the new pixel width (crisp)
      const newScale = Math.max(1.0, Math.min(3.0, committedScale.current * pinchRatio))
      committedScale.current = newScale
      pendingScroll.current  = { left: targetLeft, top: targetTop }
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
