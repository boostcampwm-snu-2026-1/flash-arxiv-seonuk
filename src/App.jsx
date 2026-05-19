import { useState, useEffect, useRef } from 'react'
import { fetchPapers } from './api/arxiv'
import './App.css'

const POLL_INTERVAL_MS = 60000
const PAGE_SIZE = 300
const KW_KEY = 'research-helper-keywords'
const SAVED_KEY = 'research-helper-saved'

function loadKeywords() {
  try {
    const stored = localStorage.getItem(KW_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

function loadSaved() {
  try {
    const stored = localStorage.getItem(SAVED_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return []
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function PaperItem({ paper, saved, onToggleSave, index }) {
  const [bounce, setBounce] = useState(false)

  function handleSave() {
    setBounce(true)
    onToggleSave(paper)
  }

  return (
    <li className="paper-item" style={{ animationDelay: `${Math.min(index, 40) * 30}ms` }}>
      <button
        className={`scrap-btn${saved ? ' scrapped' : ''}${bounce ? ' bounce' : ''}`}
        onClick={handleSave}
        onAnimationEnd={() => setBounce(false)}
        aria-label={saved ? 'Remove from saved' : 'Save paper'}
        title={saved ? 'Remove from saved' : 'Save'}
      >
        {saved ? '★' : '☆'}
      </button>
      <span className="date">{formatDate(paper.date)}</span>
      <a className="paper-title" href={paper.url} target="_blank" rel="noreferrer">
        {paper.title}
      </a>
      {paper.abstract && (
        <div className="abstract-tooltip">{paper.abstract}</div>
      )}
    </li>
  )
}

function Chip({ label, onRemove }) {
  const [removing, setRemoving] = useState(false)

  function handleRemove() {
    setRemoving(true)
  }

  return (
    <span
      className={`chip${removing ? ' removing' : ''}`}
      onAnimationEnd={() => removing && onRemove(label)}
    >
      {label}
      <button className="chip-remove" onClick={handleRemove} aria-label={`Remove ${label}`}>×</button>
    </span>
  )
}

export default function App() {
  const [tab, setTab] = useState('papers')
  const [keywords, setKeywords] = useState(loadKeywords)
  const [inputValue, setInputValue] = useState('')
  const [papers, setPapers] = useState([])
  const [paperKey, setPaperKey] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [saved, setSaved] = useState(loadSaved)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(KW_KEY, JSON.stringify(keywords))
  }, [keywords])

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved))
  }, [saved])

  async function load(kws, resetList = false) {
    if (kws.length === 0) { setPapers([]); setOffset(0); setHasMore(false); return }
    setLoading(true)
    setError(null)
    try {
      const results = await fetchPapers(kws, PAGE_SIZE, 0)
      setPapers(results)
      if (resetList) setPaperKey((k) => k + 1)
      setOffset(PAGE_SIZE)
      setHasMore(results.length === PAGE_SIZE)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    setError(null)
    try {
      const results = await fetchPapers(keywords, PAGE_SIZE, offset)
      setPapers((prev) => [...prev, ...results])
      setOffset((prev) => prev + PAGE_SIZE)
      setHasMore(results.length === PAGE_SIZE)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    clearInterval(timerRef.current)
    load(keywords, true)
    timerRef.current = setInterval(() => load(keywords, false), POLL_INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  }, [keywords])

  function addKeyword(e) {
    e.preventDefault()
    const kw = inputValue.trim().toLowerCase()
    if (!kw || keywords.includes(kw)) { setInputValue(''); return }
    setKeywords((prev) => [...prev, kw])
    setInputValue('')
  }

  function removeKeyword(kw) {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }

  function toggleSave(paper) {
    setSaved((prev) =>
      prev.some((p) => p.id === paper.id)
        ? prev.filter((p) => p.id !== paper.id)
        : [paper, ...prev]
    )
  }

  const savedIds = new Set(saved.map((p) => p.id))

  return (
    <div className="app">
      <header>
        <h1>
          Seonuk's Interactive Research Helper
          <a className="header-mail-btn" href="mailto:iamseonuk@gmail.com" title="Contact">✉</a>
        </h1>
        <nav className="tabs">
          <button className={tab === 'papers' ? 'tab active' : 'tab'} onClick={() => setTab('papers')}>
            Papers
          </button>
          <button className={tab === 'saved' ? 'tab active' : 'tab'} onClick={() => setTab('saved')}>
            Saved{saved.length > 0 && <span className="tab-count">{saved.length}</span>}
          </button>
        </nav>
      </header>

      <div className="tab-content" key={tab}>
        {tab === 'papers' && (
          <>
            <section className="keyword-section">
              <div className="keyword-chips">
                {keywords.map((kw) => (
                  <Chip key={kw} label={kw} onRemove={removeKeyword} />
                ))}
                {keywords.length === 0 && (
                  <span className="chip-empty">No keywords yet — add one below</span>
                )}
              </div>
              <form className="keyword-form" onSubmit={addKeyword}>
                <input
                  type="text"
                  placeholder="Add keyword…"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <button type="submit">Add</button>
              </form>
            </section>

            <div className="status-bar">
              {loading ? (
                <>
                  <span className="live-dot" style={{ background: 'var(--yellow)', animationDuration: '0.8s' }} />
                  Fetching up to {PAGE_SIZE} papers — this may take a moment…
                </>
              ) : error ? (
                <span style={{ color: 'var(--orange)' }}>{error}</span>
              ) : keywords.length === 0 ? null : (
                <>
                  <span className="live-dot" />
                  {papers.length} paper{papers.length !== 1 ? 's' : ''}
                  {papers.length > 0 && (() => {
                    const oldest = papers[papers.length - 1].date
                    const newest = papers[0].date
                    const fmt = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    return <span> · {fmt(oldest)} – {fmt(newest)}</span>
                  })()}
                  {lastUpdated && <span> · fetched {lastUpdated.toLocaleTimeString('en-US')}</span>}
                </>
              )}
            </div>

            <ul className="paper-list" key={paperKey}>
              {papers.map((p, i) => (
                <PaperItem key={p.id} paper={p} index={i} saved={savedIds.has(p.id)} onToggleSave={toggleSave} />
              ))}
              {!loading && papers.length === 0 && keywords.length > 0 && (
                <li className="empty">No papers found.</li>
              )}
              {keywords.length === 0 && (
                <li className="empty">Add a keyword to get started.</li>
              )}
            </ul>

            {hasMore && !loading && (
              <div className="load-more-wrap">
                <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? (
                    <><span className="dot" /><span className="dot" /><span className="dot" /></>
                  ) : (
                    'Load more'
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'saved' && (
          <>
            <div className="status-bar" style={{ marginTop: '1rem' }}>
              {saved.length} saved paper{saved.length !== 1 ? 's' : ''}
            </div>
            <ul className="paper-list">
              {saved.map((p, i) => (
                <PaperItem key={p.id} paper={p} index={i} saved={true} onToggleSave={toggleSave} />
              ))}
              {saved.length === 0 && (
                <li className="empty">No saved papers yet. Star a paper to save it.</li>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
