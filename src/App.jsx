import { useState, useEffect, useRef } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'
import { fetchPapers } from './api/arxiv'
import { summarizePaper } from './api/gemini'
import './App.css'

const POLL_INTERVAL_MS = 60000
const PAGE_SIZE = 300

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return {
    monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    year: d.getFullYear(),
  }
}

function PaperItem({ paper, saved, onToggleSave, index }) {
  const [bounce, setBounce] = useState(false)
  const [summary, setSummary] = useState(null)
  const [summarizing, setSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState(null)

  async function handleSummarize() {
    if (summary) { setSummary(null); return }
    setSummarizing(true)
    setSummaryError(null)
    try {
      setSummary(await summarizePaper(paper.title, paper.abstract))
    } catch (err) {
      setSummaryError(err.message)
    } finally {
      setSummarizing(false)
    }
  }

  const { monthDay, year } = formatDate(paper.date)
  return (
    <li className="paper-item" style={{ animationDelay: `${Math.min(index, 40) * 30}ms` }}>
      <button
        className={`scrap-btn${saved ? ' scrapped' : ''}${bounce ? ' bounce' : ''}`}
        onClick={() => { setBounce(true); onToggleSave(paper) }}
        onAnimationEnd={() => setBounce(false)}
        aria-label={saved ? 'Remove from saved' : 'Save paper'}
      >
        {saved ? '★' : '☆'}
      </button>
      <span className="date">
        <span className="date-md">{monthDay}</span>
        <span className="date-yr">{year}</span>
      </span>
      <a className="paper-title" href={paper.url} target="_blank" rel="noreferrer">{paper.title}</a>
      {paper.abstract && (
        <button className={`ai-btn${summary ? ' active' : ''}`} onClick={handleSummarize} disabled={summarizing}>
          3줄
        </button>
      )}
      {paper.abstract && <div className="abstract-tooltip">{paper.abstract}</div>}
      {summarizing && (
        <div className="ai-thinking">
          <span className="ai-spinner" />
          <span className="ai-thinking-label">번역 및 요약 중</span>
        </div>
      )}
      {summary && !summarizing && (
        <ul className="ai-summary">
          {summary.split('\n').filter((l) => l.trim()).map((line, i) => (
            <li key={i}>{line.replace(/^-\s*/, '')}</li>
          ))}
        </ul>
      )}
      {summaryError && !summarizing && <div className="ai-summary ai-summary-error">{summaryError}</div>}
    </li>
  )
}

function Chip({ label, onRemove }) {
  const [removing, setRemoving] = useState(false)
  return (
    <span className={`chip${removing ? ' removing' : ''}`} onAnimationEnd={() => removing && onRemove(label)}>
      {label}
      <button className="chip-remove" onClick={() => setRemoving(true)} aria-label={`Remove ${label}`}>×</button>
    </span>
  )
}

function LoginScreen({ onLogin }) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <h1 className="login-title">FlashArxiv</h1>
        <p className="login-desc">arXiv 최신 논문을 키워드로 빠르게 — AI 한국어 요약까지</p>
        <button className="login-btn" onClick={onLogin}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Google로 로그인
        </button>
        <ul className="login-trust">
          <li>비밀번호는 Google이 직접 처리하며 FlashArxiv에 전달되지 않습니다</li>
          <li>저장되는 정보: 이름·이메일·키워드·저장 논문 목록</li>
          <li>제3자에게 공유되지 않습니다</li>
        </ul>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataReady, setDataReady] = useState(false)
  const [tab, setTab] = useState('papers')
  const [keywords, setKeywords] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [papers, setPapers] = useState([])
  const [paperKey, setPaperKey] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [saved, setSaved] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)
  const writeTimerRef = useRef(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setDataReady(false)
      setUser(u)
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (snap.exists()) {
          const data = snap.data()
          setKeywords(data.keywords ?? [])
          setSaved(data.saved ?? [])
        }
        setDataReady(true)
      } else {
        setKeywords([])
        setSaved([])
        setPapers([])
      }
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user || !dataReady) return
    clearTimeout(writeTimerRef.current)
    writeTimerRef.current = setTimeout(() => {
      setDoc(doc(db, 'users', user.uid), { keywords, saved }, { merge: true })
    }, 800)
  }, [keywords, saved, user, dataReady])

  async function handleLogin() {
    try { await signInWithPopup(auth, googleProvider) } catch {}
  }

  async function handleLogout() {
    clearInterval(timerRef.current)
    await signOut(auth)
  }

  async function load(kws, resetList = false) {
    if (kws.length === 0) { setPapers([]); setOffset(0); setHasMore(false); return }
    setLoading(true); setError(null)
    try {
      const results = await fetchPapers(kws, PAGE_SIZE, 0)
      setPapers(results)
      if (resetList) setPaperKey((k) => k + 1)
      setOffset(PAGE_SIZE)
      setHasMore(results.length === PAGE_SIZE)
      setLastUpdated(new Date())
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function loadMore() {
    setLoadingMore(true); setError(null)
    try {
      const results = await fetchPapers(keywords, PAGE_SIZE, offset)
      setPapers((prev) => [...prev, ...results])
      setOffset((prev) => prev + PAGE_SIZE)
      setHasMore(results.length === PAGE_SIZE)
    } catch (err) { setError(err.message) }
    finally { setLoadingMore(false) }
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

  function toggleSave(paper) {
    setSaved((prev) =>
      prev.some((p) => p.id === paper.id)
        ? prev.filter((p) => p.id !== paper.id)
        : [paper, ...prev]
    )
  }

  const savedIds = new Set(saved.map((p) => p.id))

  if (authLoading) return (
    <div className="login-screen">
      <div className="auth-loading">
        <span className="think-dot" /><span className="think-dot" /><span className="think-dot" />
      </div>
    </div>
  )

  if (!user) return <LoginScreen onLogin={handleLogin} />

  return (
    <div className="app">
      <header>
        <h1>
          FlashArxiv
          <div className="user-info">
            {user.photoURL && <img className="user-avatar" src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" />}
            <span className="user-name">{user.displayName?.split(' ')[0]}</span>
            <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
          </div>
        </h1>
        <nav className="tabs">
          <button className={tab === 'papers' ? 'tab active' : 'tab'} onClick={() => setTab('papers')}>Papers</button>
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
                {keywords.map((kw) => <Chip key={kw} label={kw} onRemove={(k) => setKeywords((prev) => prev.filter((x) => x !== k))} />)}
                {keywords.length === 0 && <span className="chip-empty">No keywords yet — add one below</span>}
              </div>
              <form className="keyword-form" onSubmit={addKeyword}>
                <input type="text" placeholder="Add keyword…" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
                <button type="submit">Add</button>
              </form>
            </section>

            <div className="status-bar">
              {loading ? (
                <><span className="live-dot" style={{ background: 'var(--yellow)', animationDuration: '0.8s' }} />Fetching up to {PAGE_SIZE} papers…</>
              ) : error ? (
                <span style={{ color: 'var(--orange)' }}>{error}</span>
              ) : keywords.length === 0 ? null : (
                <>
                  <span className="live-dot" />
                  {papers.length} paper{papers.length !== 1 ? 's' : ''}
                  {papers.length > 0 && (() => {
                    const fmt = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    return <span> · {fmt(papers[papers.length - 1].date)} – {fmt(papers[0].date)}</span>
                  })()}
                  {lastUpdated && <span> · fetched {lastUpdated.toLocaleTimeString('en-US')}</span>}
                </>
              )}
            </div>

            <ul className="paper-list" key={paperKey}>
              {papers.map((p, i) => <PaperItem key={p.id} paper={p} index={i} saved={savedIds.has(p.id)} onToggleSave={toggleSave} />)}
              {!loading && papers.length === 0 && keywords.length > 0 && <li className="empty">No papers found.</li>}
              {keywords.length === 0 && <li className="empty">Add a keyword to get started.</li>}
            </ul>

            {hasMore && !loading && (
              <div className="load-more-wrap">
                <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <><span className="dot" /><span className="dot" /><span className="dot" /></> : 'Load more'}
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
              {saved.map((p, i) => <PaperItem key={p.id} paper={p} index={i} saved={true} onToggleSave={toggleSave} />)}
              {saved.length === 0 && <li className="empty">No saved papers yet. Star a paper to save it.</li>}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
