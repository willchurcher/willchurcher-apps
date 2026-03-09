import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { marked } from 'marked'
import { HeaderRight } from './HeaderRight'
import { supabase } from './supabase'

async function fetchNotesHtml(chapterFilter: string | null): Promise<{ title: string; html: string }[]> {
  let query = supabase
    .from('cpp_lessons')
    .select('chapter, chapter_title, lesson_number, lesson_title, formatted_notes')
    .not('formatted_notes', 'is', null)
    .order('chapter', { ascending: true })
    .order('lesson_number', { ascending: true })
  if (chapterFilter) query = query.eq('chapter', chapterFilter)
  const { data } = await query
  return (data ?? []).map(l => ({
    title: `${l.lesson_number} — ${l.lesson_title}`,
    html: marked(l.formatted_notes!) as string,
  }))
}

const PDF_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Georgia', serif;
    font-size: 13px;
    line-height: 1.65;
    color: #111;
    background: white;
    padding: 32px;
    width: 750px;
  }
  h1 { font-size: 1.5em; margin: 1.2em 0 0.5em; }
  h2 { font-size: 1.2em; margin: 1em 0 0.4em; }
  h3 { font-size: 1.05em; margin: 0.8em 0 0.3em; }
  p { margin: 0.5em 0; }
  ul, ol { margin: 0.5em 0 0.5em 1.5em; }
  li { margin: 0.25em 0; }
  code {
    font-family: 'Courier New', monospace;
    font-size: 0.85em;
    background: #f4f4f4;
    padding: 1px 4px;
    border-radius: 3px;
  }
  pre {
    background: #f4f4f4;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.75em 1em;
    margin: 0.75em 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
  pre code { background: none; padding: 0; font-size: 0.82em; }
  blockquote {
    border-left: 3px solid #888;
    padding: 0.4em 0.75em;
    margin: 0.75em 0;
    color: #444;
    background: #fafafa;
  }
  table { border-collapse: collapse; width: 100%; margin: 0.75em 0; }
  th, td { border: 1px solid #ccc; padding: 0.4em 0.6em; text-align: left; }
  th { background: #eee; }
  hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
`

async function downloadPdf(chapterFilter: string | null, filename: string) {
  const lessons = await fetchNotesHtml(chapterFilter)
  if (!lessons.length) { alert('No notes available to export.'); return }

  const { default: jsPDF } = await import('jspdf')
  const { default: html2canvas } = await import('html2canvas')

  const body = lessons.map(l => `<div class="lesson">${l.html}</div>`).join('<hr/>')

  // Render into a hidden off-screen div
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;top:-99999px;left:0;width:750px;background:white;'
  const style = document.createElement('style')
  style.textContent = PDF_CSS
  container.appendChild(style)
  const content = document.createElement('div')
  content.innerHTML = body
  container.appendChild(content)
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 750,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgW = pageW
    const imgH = (canvas.height / canvas.width) * imgW
    let y = 0
    let remaining = imgH

    while (remaining > 0) {
      if (y > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, -y, imgW, imgH)
      y += pageH
      remaining -= pageH
    }

    pdf.save(filename)
  } finally {
    document.body.removeChild(container)
  }
}

interface Lesson {
  id: number
  chapter: string
  chapter_title: string
  lesson_number: string
  lesson_title: string
  scraped_at: string | null
  extracted_at: string | null
  formatted_at: string | null
  cards_at: string | null
}

interface LessonDetail extends Lesson {
  formatted_notes: string | null
  clean_text: string | null
}

// Map chapter → chapter_title from the lesson list
function chapterTitleMap(lessons: Lesson[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const l of lessons) {
    if (!map[l.chapter]) map[l.chapter] = l.chapter_title
  }
  return map
}

function StatusDot({ done }: { done: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: done ? 'var(--accent)' : 'var(--border)',
        flexShrink: 0,
      }}
    />
  )
}

function PipelineStatus({ lesson }: { lesson: Lesson }) {
  const stages = [
    { label: 'HTML',   done: !!lesson.scraped_at },
    { label: 'Clean',  done: !!lesson.extracted_at },
    { label: 'Notes',  done: !!lesson.formatted_at },
    { label: 'Cards',  done: !!lesson.cards_at },
  ]
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {stages.map(s => (
        <span
          key={s.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontSize: '0.62rem',
            color: s.done ? 'var(--accent)' : 'var(--muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <StatusDot done={s.done} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

function NotesView({ lesson, onBack }: { lesson: LessonDetail; onBack: () => void }) {
  const navigate = useNavigate()
  const [showRaw, setShowRaw] = useState(false)
  const [exporting, setExporting] = useState(false)

  const content = lesson.formatted_notes ?? lesson.clean_text
  const html = content ? marked(content) as string : null

  async function handleDownload() {
    setExporting(true)
    await downloadPdf(lesson.chapter, `cpp-chapter-${lesson.chapter}-notes.pdf`)
    setExporting(false)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={onBack}>‹ Back</button>
          <span className="page-header-title" style={{ fontSize: '0.75rem' }}>
            {lesson.lesson_number} — {lesson.lesson_title}
          </span>
        </div>
        <HeaderRight options={close => (
          <>
            <button className="header-toast-item" onClick={() => { close(); setShowRaw(r => !r) }}>
              {showRaw ? 'Show rendered' : 'Show raw markdown'}
            </button>
            <button className="header-toast-item" onClick={() => { close(); handleDownload() }} disabled={exporting}>
              {exporting ? 'Preparing…' : 'Download chapter PDF'}
            </button>
            <button className="header-toast-item" onClick={() => { close(); navigate('/') }}>Home</button>
          </>
        )} />
      </header>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 1.25rem 3rem',
        }}
      >
        {!content ? (
          <div style={{ color: 'var(--muted)', padding: '2rem 0', textAlign: 'center' }}>
            {lesson.scraped_at
              ? 'Notes not generated yet — run stage 4 for this lesson.'
              : 'Not yet scraped — run pipeline stages 1–4.'}
          </div>
        ) : showRaw ? (
          <pre style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            whiteSpace: 'pre-wrap',
            color: 'var(--text)',
            lineHeight: 1.6,
          }}>
            {content}
          </pre>
        ) : (
          <div
            className="fq-notes-md"
            dangerouslySetInnerHTML={{ __html: html ?? '' }}
          />
        )}
      </div>
    </div>
  )
}

export default function CppNotes() {
  const navigate = useNavigate()
  const [lessons, setLessons]           = useState<Lesson[]>([])
  const [loading, setLoading]           = useState(true)
  const [chapter, setChapter]           = useState('all')
  const [selected, setSelected]         = useState<LessonDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [exporting, setExporting]       = useState(false)

  async function handleDownload(chapterFilter: string | null, label: string) {
    setExporting(true)
    await downloadPdf(chapterFilter, label.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".pdf")
    setExporting(false)
  }

  useEffect(() => {
    supabase
      .from('cpp_lessons')
      .select('id, chapter, chapter_title, lesson_number, lesson_title, scraped_at, extracted_at, formatted_at, cards_at')
      .order('chapter', { ascending: true })
      .order('lesson_number', { ascending: true })
      .then(({ data }) => {
        setLessons(data ?? [])
        setLoading(false)
      })
  }, [])

  const chapters = useMemo(
    () => [...new Set(lessons.map(l => l.chapter))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    ),
    [lessons]
  )
  const chTitles = useMemo(() => chapterTitleMap(lessons), [lessons])

  const visible = chapter === 'all' ? lessons : lessons.filter(l => l.chapter === chapter)

  // Status summary for chapter tab
  function chapterStatus(ch: string) {
    const ls = lessons.filter(l => l.chapter === ch)
    const done = ls.filter(l => !!l.formatted_at).length
    return `${done}/${ls.length}`
  }

  async function openLesson(lesson: Lesson) {
    setLoadingDetail(true)
    const { data } = await supabase
      .from('cpp_lessons')
      .select('id, chapter, chapter_title, lesson_number, lesson_title, scraped_at, extracted_at, formatted_at, cards_at, formatted_notes, clean_text')
      .eq('id', lesson.id)
      .single()
    setSelected(data as LessonDetail ?? null)
    setLoadingDetail(false)
  }

  if (selected) {
    return <NotesView lesson={selected} onBack={() => setSelected(null)} />
  }

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
            <button
              className="header-toast-item"
              disabled={exporting || chapter === 'all'}
              onClick={() => {
                close()
                const chTitles = chapterTitleMap(lessons)
                handleDownload(chapter, `Ch.${chapter} — ${chTitles[chapter] ?? 'C++'} Notes`)
              }}
            >
              {exporting ? 'Preparing…' : 'Download chapter PDF'}
            </button>
            <button
              className="header-toast-item"
              disabled={exporting}
              onClick={() => { close(); handleDownload(null, 'C++ Notes — All Chapters') }}
            >
              {exporting ? 'Preparing…' : 'Download all chapters PDF'}
            </button>
          </>
        )} />
      </header>

      {/* Chapter filter */}
      <div className="fq-filter-row">
        <select
          className="fq-filter-select"
          value={chapter}
          onChange={e => setChapter(e.target.value)}
        >
          <option value="all">All chapters ({lessons.length})</option>
          {chapters.map(ch => (
            <option key={ch} value={ch}>
              Ch.{ch} — {chTitles[ch]} ({chapterStatus(ch)} notes)
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem' }}>
          Loading lessons…
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem' }}>
          No lessons found — run the pipeline index stage first.
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {visible.map(lesson => (
            <button
              key={lesson.id}
              onClick={() => openLesson(lesson)}
              disabled={loadingDetail}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                opacity: loadingDetail ? 0.5 : 1,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.5rem',
                marginBottom: '0.3rem',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  color: 'var(--accent)',
                  flexShrink: 0,
                }}>
                  {lesson.lesson_number}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: 'var(--text)',
                }}>
                  {lesson.lesson_title}
                </span>
              </div>
              <PipelineStatus lesson={lesson} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
