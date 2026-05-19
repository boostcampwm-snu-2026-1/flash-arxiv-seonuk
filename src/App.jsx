import { useState, useEffect, useRef } from 'react'
import { fetchPapers } from './api/arxiv'
import './App.css'

const POLL_INTERVAL_MS = 60000
const PAGE_SIZE = 20
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

function PaperItem({ paper, saved, onToggleSave }) {
  return (
    <li className="paper-item">
      <button
        className={`scrap-btn${saved ? ' scrapped' : ''}`}
        onClick={() => onToggleSave(paper)}
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

export default function App() {
  const [tab, setTab] = useState('papers')
  const [keywords, setKeywords] = useState(loadKeywords)
  const [inputValue, setInputValue] = useState('')
  const [papers, setPapers] = useState([])
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

  async function load(kws) {
    if (kws.length === 0) { setPapers([]); setOffset(0); setHasMore(false); return }
    setLoading(true)
    setError(null)
    try {
      const results = await fetchPapers(kws, PAGE_SIZE, 0)
      setPapers(results)
      setOffset(PAGE_SIZE)
      setHasMore(results.length === PAGE_SIZE)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadMore(kws) {
    setLoadingMore(true)
    try {
      const results = await fetchPapers(kws, PAGE_SIZE, offset)
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
    load(keywords)
    timerRef.current = setInterval(() => load(keywords), POLL_INTERVAL_MS)
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
        <h1>Seonuk's Interactive Research Helper</h1>
        <nav className="tabs">
          <button className={tab === 'papers' ? 'tab active' : 'tab'} onClick={() => setTab('papers')}>
            Papers
          </button>
          <button className={tab === 'saved' ? 'tab active' : 'tab'} onClick={() => setTab('saved')}>
            Saved{saved.length > 0 && <span className="tab-count">{saved.length}</span>}
          </button>
        </nav>
      </header>

      {tab === 'papers' && (
        <>
          <section className="keyword-section">
            <div className="keyword-chips">
              {keywords.map((kw) => (
                <span key={kw} className="chip">
                  {kw}
                  <button className="chip-remove" onClick={() => removeKeyword(kw)} aria-label={`Remove ${kw}`}>×</button>
                </span>
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
              <><span className="live-dot" style={{ background: 'var(--yellow)' }} /> Fetching…</>
            ) : error ? (
              <span style={{ color: 'var(--orange)' }}>{error}</span>
            ) : keywords.length === 0 ? null : (
              <>
                <span className="live-dot" />
                {papers.length} paper{papers.length !== 1 ? 's' : ''}
                {lastUpdated && <span> · {lastUpdated.toLocaleTimeString('en-US')}</span>}
              </>
            )}
          </div>

          <ul className="paper-list">
            {papers.map((p) => (
              <PaperItem key={p.id} paper={p} saved={savedIds.has(p.id)} onToggleSave={toggleSave} />
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
              <button className="load-more-btn" onClick={() => loadMore(keywords)} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
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
            {saved.map((p) => (
              <PaperItem key={p.id} paper={p} saved={true} onToggleSave={toggleSave} />
            ))}
            {saved.length === 0 && (
              <li className="empty">No saved papers yet. Star a paper to save it.</li>
            )}
          </ul>
        </>
      )}
    </div>
  )
}
