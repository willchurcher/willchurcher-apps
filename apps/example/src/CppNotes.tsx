import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { marked } from 'marked'
import { HeaderRight } from './HeaderRight'
import { supabase } from './supabase'

interface Lesson {
  id: number
  chapter: string
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

  const content = lesson.formatted_notes ?? lesson.clean_text
  const html = content ? marked(content) as string : null

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

  useEffect(() => {
    supabase
      .from('cpp_lessons')
      .select('id, chapter, lesson_number, lesson_title, scraped_at, extracted_at, formatted_at, cards_at')
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
      .select('id, chapter, lesson_number, lesson_title, scraped_at, extracted_at, formatted_at, cards_at, formatted_notes, clean_text')
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
          <button className="header-toast-item" onClick={() => { close(); navigate('/cpp-ch1') }}>
            Open Quiz
          </button>
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
              Ch.{ch} — {chapterStatus(ch)} notes ready
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
