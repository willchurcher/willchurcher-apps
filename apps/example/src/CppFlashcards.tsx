import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeaderRight } from './HeaderRight'
import { FLASHCARDS, TOPICS, type Flashcard } from './cpp-flashcards-data'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getCards(topic: string): Flashcard[] {
  return topic === 'all' ? FLASHCARDS : FLASHCARDS.filter(c => c.topic === topic)
}

export default function CppFlashcards() {
  const navigate = useNavigate()
  const [topic, setTopic] = useState('all')
  const [queue, setQueue] = useState<Flashcard[]>(() => shuffle(FLASHCARDS))
  const [flipped, setFlipped] = useState(false)
  const [gotCount, setGotCount] = useState(0)

  const totalForTopic = getCards(topic).length
  const card = queue[0]
  const done = queue.length === 0

  function changeTopic(t: string) {
    setTopic(t)
    setQueue(shuffle(getCards(t)))
    setFlipped(false)
    setGotCount(0)
  }

  function gotIt() {
    setGotCount(c => c + 1)
    setQueue(q => q.slice(1))
    setFlipped(false)
  }

  function stillLearning() {
    setQueue(q => [...q.slice(1), q[0]])
    setFlipped(false)
  }

  function reset() {
    setQueue(shuffle(getCards(topic)))
    setFlipped(false)
    setGotCount(0)
  }

  const progressPct = totalForTopic > 0 ? (gotCount / totalForTopic) * 100 : 0

  if (done) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-header-left">
            <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
            <span className="page-header-title">C++ Quiz</span>
          </div>
          <HeaderRight options={close => (
            <button className="header-toast-item" onClick={() => { close(); reset() }}>Restart deck</button>
          )} />
        </header>
        <div className="fq-done-screen">
          <div className="fq-done-check">✓</div>
          <div className="fq-done-title">Deck complete</div>
          <div className="fq-done-sub">{gotCount} of {totalForTopic} cards</div>
          <button className="btn btn-primary fq-done-restart" onClick={reset}>Restart</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">C++ Quiz</span>
        </div>
        <HeaderRight options={close => (
          <button className="header-toast-item" onClick={() => { close(); reset() }}>Reshuffle</button>
        )} />
      </header>

      {/* Topic pills */}
      <div className="fq-topics">
        <button
          className={`fq-pill${topic === 'all' ? ' fq-pill-active' : ''}`}
          onClick={() => changeTopic('all')}
        >
          All ({FLASHCARDS.length})
        </button>
        {TOPICS.map(t => (
          <button
            key={t}
            className={`fq-pill${topic === t ? ' fq-pill-active' : ''}`}
            onClick={() => changeTopic(t)}
          >
            {t} ({getCards(t).length})
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="fq-progress">
        <div className="fq-progress-bar">
          <div className="fq-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="fq-progress-text">{gotCount} done · {queue.length} left</div>
      </div>

      {/* Card area */}
      <div className="fq-body">
        <div
          className="fq-scene"
          onClick={() => setFlipped(f => !f)}
          role="button"
          aria-label={flipped ? 'Flip back to question' : 'Reveal answer'}
        >
          <div className={`fq-card${flipped ? ' fq-card-flipped' : ''}`}>
            {/* Front — Question */}
            <div className="fq-face fq-front">
              <span className="fq-topic-badge">{card.topic}</span>
              <p className="fq-q-text">{card.q}</p>
              <span className="fq-flip-hint">tap to reveal</span>
            </div>
            {/* Back — Answer */}
            <div className="fq-face fq-back">
              <span className="fq-answer-label">Answer</span>
              <p className="fq-a-text">{card.a}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="fq-actions">
          <button
            className="btn fq-btn-still"
            onClick={stillLearning}
            disabled={!flipped}
          >
            Still learning
          </button>
          <button
            className="btn btn-primary fq-btn-got"
            onClick={gotIt}
            disabled={!flipped}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
