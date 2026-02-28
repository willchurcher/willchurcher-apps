import { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useNavigate } from 'react-router-dom'
import { HeaderRight } from './HeaderRight'
import {
  listPdfs,
  savePdf,
  loadPdfData,
  deletePdf,
  updatePages,
  listNotes,
  saveNote,
  deleteNote,
  type PdfMeta,
  type PdfNote,
} from './pdfStorage'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const SIDEBAR_W = 44

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Flashcard overlay ────────────────────────────────────────────────────────

function Flashcard({ note, onClose }: { note: PdfNote; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="fc-overlay" onClick={() => flipped ? onClose() : setFlipped(true)}>
      <div className="fc-card" onClick={e => e.stopPropagation()}>
        <div className={`fc-face ${flipped ? 'fc-face-a' : 'fc-face-q'}`}>
          <span className="fc-badge">{flipped ? 'A' : 'Q'}</span>
          <p className="fc-text">{flipped ? note.answer : note.question}</p>
          <span className="fc-hint">{flipped ? 'tap outside to close' : 'tap to reveal answer'}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Note creation form ───────────────────────────────────────────────────────

function NoteForm({ onSave, onCancel }: { onSave: (q: string, a: string) => void; onCancel: () => void }) {
  const [q, setQ] = useState('')
  const [a, setA] = useState('')

  return (
    <div className="fc-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="note-form-card" onClick={e => e.stopPropagation()}>
        <span className="note-form-title">New note</span>
        <textarea
          className="note-form-field"
          placeholder="Question…"
          value={q}
          onChange={e => setQ(e.target.value)}
          rows={3}
          autoFocus
        />
        <textarea
          className="note-form-field"
          placeholder="Answer…"
          value={a}
          onChange={e => setA(e.target.value)}
          rows={4}
        />
        <div className="note-form-actions">
          <button className="note-form-btn note-form-cancel" onClick={onCancel}>Cancel</button>
          <button
            className="note-form-btn note-form-save"
            disabled={!q.trim() || !a.trim()}
            onClick={() => onSave(q.trim(), a.trim())}
          >Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── Library screen ───────────────────────────────────────────────────────────

function PdfLibrary({ docs, onOpen, onDelete, onAdd }: {
  docs: PdfMeta[]; onOpen: (doc: PdfMeta) => void
  onDelete: (doc: PdfMeta) => void; onAdd: () => void
}) {
  const navigate = useNavigate()
  return (
    <div className="pdfquiz-page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">PDF Viewer</span>
        </div>
        <HeaderRight />
      </header>

      <div className="pdf-library">
        {docs.length === 0 ? (
          <div className="pdf-library-empty">
            <span className="pdfquiz-placeholder-icon">📄</span>
            <span>No saved PDFs yet</span>
          </div>
        ) : (
          <div className="pdf-library-list">
            {docs.map(doc => (
              <div key={doc.id} className="card pdf-library-card" onClick={() => onOpen(doc)}>
                <span className="pdf-card-icon">📄</span>
                <div className="pdf-card-info">
                  <span className="pdf-card-name">{doc.name}</span>
                  <span className="pdf-card-meta">
                    {doc.pages > 0 ? `${doc.pages} pages · ` : ''}{fmtSize(doc.size)}
                  </span>
                </div>
                <button className="pdf-card-delete" aria-label="Delete"
                  onClick={e => { e.stopPropagation(); onDelete(doc) }}>🗑</button>
              </div>
            ))}
          </div>
        )}
        <button className="pdf-add-btn" onClick={onAdd}>+ Add PDF</button>
      </div>
    </div>
  )
}

// ─── Viewer screen ────────────────────────────────────────────────────────────

function PdfViewer({ docId, data, name, onBack, onPagesLoaded }: {
  docId: number; data: ArrayBuffer; name: string
  onBack: () => void; onPagesLoaded: (id: number, pages: number) => void
}) {
  const [numPages,    setNumPages]    = useState(0)
  const [renderScale, setRenderScale] = useState(1.0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notes,       setNotes]       = useState<PdfNote[]>([])
  const [creating,    setCreating]    = useState<number | null>(null)
  const [flashcard,   setFlashcard]   = useState<PdfNote | null>(null)

  const viewerRef      = useRef<HTMLDivElement>(null)
  const contentRef     = useRef<HTMLDivElement>(null)
  const committedScale      = useRef(1.0)
  const pendingScroll       = useRef<{ left: number; top: number } | null>(null)
  const pendingResizeScroll = useRef<{ left: number; top: number } | null>(null)
  const prevViewerWidth     = useRef(window.innerWidth)
  const [viewerWidth, setViewerWidth] = useState(window.innerWidth)

  useEffect(() => { listNotes(docId).then(setNotes) }, [docId])

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => {
      const newWidth = e.contentRect.width
      const oldWidth = prevViewerWidth.current
      if (newWidth !== oldWidth && viewerRef.current) {
        const ratio = newWidth / oldWidth
        pendingResizeScroll.current = {
          left: viewerRef.current.scrollLeft * ratio,
          top:  viewerRef.current.scrollTop  * ratio,
        }
      }
      prevViewerWidth.current = newWidth
      setViewerWidth(newWidth)
    })
    if (viewerRef.current) obs.observe(viewerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const target = pendingResizeScroll.current
    if (!target || !viewerRef.current) return
    pendingResizeScroll.current = null
    requestAnimationFrame(() => {
      if (!viewerRef.current) return
      viewerRef.current.scrollLeft = target.left
      viewerRef.current.scrollTop  = target.top
    })
  }, [viewerWidth])

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

    const blockGesture = (e: Event) => e.preventDefault()
    document.addEventListener('gesturestart',  blockGesture, { passive: false })
    document.addEventListener('gesturechange', blockGesture, { passive: false })

    let startDist = 0, startMidX = 0, startMidY = 0, pinchRatio = 1.0

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
      pinchRatio = Math.max(1.0, Math.min(3.0, total)) / committedScale.current
      const rect    = viewer.getBoundingClientRect()
      const originX = (startMidX - rect.left) + viewer.scrollLeft
      const originY = (startMidY - rect.top)  + viewer.scrollTop
      content.style.transformOrigin = `${originX}px ${originY}px`
      content.style.transform       = `scale(${pinchRatio})`
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (startDist <= 0 || e.touches.length >= 2) return
      const rect = viewer.getBoundingClientRect()
      const cx = startMidX - rect.left
      const cy = startMidY - rect.top
      const targetLeft = viewer.scrollLeft * pinchRatio + cx * (pinchRatio - 1)
      const targetTop  = viewer.scrollTop  * pinchRatio + cy * (pinchRatio - 1)
      content.style.transform = ''
      content.style.transformOrigin = ''
      const newScale = Math.max(1.0, Math.min(3.0, committedScale.current * pinchRatio))
      committedScale.current = newScale
      pendingScroll.current  = { left: targetLeft, top: targetTop }
      setRenderScale(newScale)
      startDist = 0; pinchRatio = 1.0
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

  const handleSidebarTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!viewerRef.current) return
    const rect = viewerRef.current.getBoundingClientRect()
    const yPos = e.clientY - rect.top + viewerRef.current.scrollTop
    setCreating(yPos)
  }

  const handleSaveNote = async (q: string, a: string) => {
    if (creating === null) return
    const note = await saveNote(docId, creating, q, a)
    setNotes(prev => [...prev, note])
    setCreating(null)
  }

  const handleDeleteNote = async (note: PdfNote) => {
    await deleteNote(note.id)
    setNotes(prev => prev.filter(n => n.id !== note.id))
  }

  const effectiveWidth = sidebarOpen ? viewerWidth - SIDEBAR_W : viewerWidth

  return (
    <div className="pdfquiz-page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={onBack}>‹ Library</button>
          <span className="page-header-title">{name}</span>
        </div>
        <HeaderRight options={close => (
          <button className="header-toast-item"
            onClick={() => { setSidebarOpen(v => !v); close() }}>
            {sidebarOpen ? '✕ Hide notes' : '📝 Notes'}
          </button>
        )} />
      </header>

      <div className="pdfquiz-viewer" ref={viewerRef}>
        <div className="pdfquiz-row">
          <div ref={contentRef} className="pdfquiz-content">
            <Document
              file={data}
              onLoadSuccess={({ numPages: n }) => { setNumPages(n); onPagesLoaded(docId, n) }}
              loading={<div className="pdfquiz-loading">Loading…</div>}
            >
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i} className="pdfquiz-page-wrap">
                  <Page
                    pageNumber={i + 1}
                    width={effectiveWidth * renderScale}
                    renderAnnotationLayer={false}
                    renderTextLayer={true}
                  />
                </div>
              ))}
            </Document>
          </div>

          {sidebarOpen && (
            <div className="pdf-sidebar" onClick={handleSidebarTap}>
              {notes.map(note => (
                <button
                  key={note.id}
                  className="pdf-note-pin"
                  style={{ top: note.yPos }}
                  title={note.question}
                  onClick={e => { e.stopPropagation(); setFlashcard(note) }}
                  onContextMenu={e => {
                    e.preventDefault(); e.stopPropagation()
                    if (confirm('Delete this note?')) handleDeleteNote(note)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {creating !== null && (
        <NoteForm onSave={handleSaveNote} onCancel={() => setCreating(null)} />
      )}

      {flashcard && (
        <Flashcard note={flashcard} onClose={() => setFlashcard(null)} />
      )}
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function PdfQuiz() {
  const [docs,   setDocs]   = useState<PdfMeta[]>([])
  const [viewer, setViewer] = useState<{ docId: number; data: ArrayBuffer; name: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listPdfs().then(list => setDocs(list.sort((a, b) => b.addedAt - a.addedAt)))
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    const data = await f.arrayBuffer()
    const id   = await savePdf(f.name, f.size, data)
    const meta: PdfMeta = { id, name: f.name, size: f.size, pages: 0, addedAt: Date.now() }
    setDocs(prev => [meta, ...prev])
    setViewer({ docId: id, data, name: f.name })
  }

  const handleOpen = async (doc: PdfMeta) => {
    const data = await loadPdfData(doc.id)
    setViewer({ docId: doc.id, data, name: doc.name })
  }

  const handleDelete = async (doc: PdfMeta) => {
    await deletePdf(doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  const handlePagesLoaded = async (id: number, pages: number) => {
    await updatePages(id, pages)
    setDocs(prev => prev.map(d => d.id === id ? { ...d, pages } : d))
  }

  return (
    <>
      {viewer ? (
        <PdfViewer
          docId={viewer.docId}
          data={viewer.data}
          name={viewer.name}
          onBack={() => setViewer(null)}
          onPagesLoaded={handlePagesLoaded}
        />
      ) : (
        <PdfLibrary
          docs={docs}
          onOpen={handleOpen}
          onDelete={handleDelete}
          onAdd={() => fileRef.current?.click()}
        />
      )}

      <input ref={fileRef} type="file" accept=".pdf"
        onChange={handleFileChange} style={{ display: 'none' }} />
    </>
  )
}
