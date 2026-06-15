import { useState, useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'
import { fetchPapers } from './api/arxiv'
import { summarizePaper } from './api/gemini'
import { ARXIV_TAXONOMY } from './data/arxivCategories'
import './App.css'

const POLL_INTERVAL_MS = 60000
const PAGE_SIZE = 300
const USER_CACHE_KEY = 'flasharxiv-user'

function loadCachedUser() {
  try { return JSON.parse(localStorage.getItem(USER_CACHE_KEY)) } catch { return null }
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function friendlyError(msg) {
  if (msg.includes('Quota exceeded') || msg.includes('quota')) {
    const match = msg.match(/retry in ([\d.]+)s/)
    if (match) return `무료 한도 초과 — ${Math.ceil(parseFloat(match[1]))}초 후 재시도`
    return '무료 한도 초과 — 잠시 후 재시도해주세요'
  }
  if (msg.includes('401') || msg.includes('API key')) return 'API 키 오류'
  return '요약 실패 — 잠시 후 재시도해주세요'
}

function StarIcon({ filled }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function groupByDate(papers) {
  const groups = []
  for (const paper of papers) {
    if (groups.length === 0 || groups[groups.length - 1].date !== paper.date) {
      groups.push({ date: paper.date, papers: [paper] })
    } else {
      groups[groups.length - 1].papers.push(paper)
    }
  }
  return groups
}

function CategoryPicker({ onSelect, selected }) {
  const [activeTop, setActiveTop] = useState(null)

  function handleTopClick(group) {
    if (group.subs.length === 0) {
      onSelect(group.id)
    } else {
      setActiveTop((prev) => (prev === group.id ? null : group.id))
    }
  }

  const activeSubs = activeTop ? ARXIV_TAXONOMY.find((g) => g.id === activeTop)?.subs ?? [] : []

  return (
    <div className="cat-picker">
      <div className="cat-picker-top">
        {ARXIV_TAXONOMY.map((group) => (
          <button
            key={group.id}
            className={`cat-top-btn${activeTop === group.id ? ' active' : ''}${selected.includes(group.id) ? ' selected' : ''}`}
            onClick={() => handleTopClick(group)}
            title={group.name}
          >
            {group.id}
          </button>
        ))}
      </div>
      {activeSubs.length > 0 && (
        <div className="cat-picker-subs">
          {activeSubs.map((sub) => (
            <button
              key={sub.id}
              className={`cat-sub-btn${selected.includes(sub.id) ? ' selected' : ''}`}
              onClick={() => onSelect(sub.id)}
              title={sub.name}
            >
              {sub.id}
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
      setSummary(await summarizePaper(paper.id, paper.title, paper.abstract))
    } catch (err) {
      setSummaryError(friendlyError(err.message))
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <li className="paper-item" style={{ animationDelay: `${Math.min(index, 40) * 30}ms` }}>
      <a className="paper-title" href={paper.url} target="_blank" rel="noreferrer">{paper.title}</a>
      {paper.abstract && (
        <button className={`ai-btn${summary ? ' active' : ''}`} onClick={handleSummarize} disabled={summarizing}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
          3줄
        </button>
      )}
      <button
        className={`scrap-btn${saved ? ' scrapped' : ''}${bounce ? ' bounce' : ''}`}
        onClick={() => { setBounce(true); onToggleSave(paper) }}
        onAnimationEnd={() => setBounce(false)}
        aria-label={saved ? 'Remove from saved' : 'Save paper'}
      >
        <StarIcon filled={saved} />
      </button>
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

function SavedPaperItem({ paper, onToggleSave, isPending, note, onNoteChange, folders, folderId, onFolderChange, index }) {
  const [bounce, setBounce] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [summary, setSummary] = useState(null)
  const [summarizing, setSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState(null)

  async function handleSummarize() {
    if (summary) { setSummary(null); return }
    setSummarizing(true)
    setSummaryError(null)
    try {
      setSummary(await summarizePaper(paper.id, paper.title, paper.abstract))
    } catch (err) {
      setSummaryError(friendlyError(err.message))
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <li className="paper-item saved-item" style={{ animationDelay: `${Math.min(index, 40) * 30}ms` }}>
      <div className="saved-row">
        <a className="paper-title" href={paper.url} target="_blank" rel="noreferrer">{paper.title}</a>
        {paper.abstract && (
          <button className={`ai-btn${summary ? ' active' : ''}`} onClick={handleSummarize} disabled={summarizing}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
            3줄
          </button>
        )}
        <button
          className={`scrap-btn${isPending ? '' : ' scrapped'}${bounce ? ' bounce' : ''}`}
          onClick={() => { setBounce(true); onToggleSave(paper) }}
          onAnimationEnd={() => setBounce(false)}
          aria-label={isPending ? 'Restore saved' : 'Remove from saved'}
        >
          <StarIcon filled={!isPending} />
        </button>
        <button
          className={`note-btn${note ? ' has-note' : ''}${noteOpen ? ' open' : ''}`}
          onClick={() => {
            if (noteOpen) { setNoteOpen(false); setEditing(false) }
            else { setNoteOpen(true); if (!note) setEditing(true) }
          }}
          title={note ? (noteOpen ? 'Close note' : 'Open note') : 'Add note'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </button>
        {folders.length > 0 && (
          <select
            className="folder-select"
            value={folderId ?? ''}
            onChange={(e) => onFolderChange(paper.id, e.target.value || null)}
          >
            <option value="">—</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
      </div>
      {noteOpen && note && !editing && (
        <div className="note-preview">
          <Markdown>{note}</Markdown>
          <div className="note-preview-actions">
            <button className="note-edit-btn" onClick={() => setEditing(true)}>Edit</button>
            <button className="note-delete-btn" onClick={() => { onNoteChange(paper.id, ''); setNoteOpen(false) }}>Delete</button>
          </div>
        </div>
      )}
      {noteOpen && editing && (
        <div className="note-editor">
          <textarea
            className="note-area"
            placeholder="Add a note…"
            value={note ?? ''}
            onChange={(e) => onNoteChange(paper.id, e.target.value)}
            rows={3}
          />
          <div className="note-editor-footer">
            <span className="note-hint">Markdown 지원</span>
            <button className="note-post-btn" onClick={() => { setEditing(false); if (!note) setNoteOpen(false) }}>Post</button>
          </div>
        </div>
      )}
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

function Chip({ label, onRemove, variant }) {
  const [removing, setRemoving] = useState(false)
  return (
    <span
      className={`chip${variant ? ` chip-${variant}` : ''}${removing ? ' removing' : ''}`}
      onAnimationEnd={() => removing && onRemove(label)}
    >
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
        <p className="login-desc">최신 arXiv 논문 탐색, AI 한국어 요약.</p>
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
          <li>로그인은 Google이 처리하며, 데이터는 외부에 공유되지 않습니다</li>
        </ul>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(loadCachedUser)
  const [authLoading, setAuthLoading] = useState(() => !loadCachedUser())
  const [dataReady, setDataReady] = useState(false)
  const [tab, setTab] = useState(() => localStorage.getItem('flasharxiv-tab') ?? 'papers')

  function switchTab(newTab) {
    localStorage.setItem('flasharxiv-tab', newTab)
    if (pendingRemoval.size > 0) {
      setSaved(prev => prev.filter(p => !pendingRemoval.has(p.id)))
      setNotes(prev => { const n = { ...prev }; pendingRemoval.forEach(id => delete n[id]); return n })
      setPaperFolders(prev => { const pf = { ...prev }; pendingRemoval.forEach(id => delete pf[id]); return pf })
      setPendingRemoval(new Set())
    }
    setTab(newTab)
  }
  const [keywords, setKeywords] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [categories, setCategories] = useState([])
  const [papers, setPapers] = useState([])
  const [paperKey, setPaperKey] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [saved, setSaved] = useState([])
  const [pendingRemoval, setPendingRemoval] = useState(new Set())
  const [notes, setNotes] = useState({})
  const [folders, setFolders] = useState([])
  const [paperFolders, setPaperFolders] = useState({})
  const [activeFolder, setActiveFolder] = useState(null)
  const [savedSearch, setSavedSearch] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [addingFolder, setAddingFolder] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)
  const writeTimerRef = useRef(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setDataReady(false)
      if (u) {
        const cached = { uid: u.uid, displayName: u.displayName, photoURL: u.photoURL }
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cached))
        setUser(cached)
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (snap.exists()) {
          const data = snap.data()
          setKeywords(data.keywords ?? [])
          setSaved(data.saved ?? [])
          setCategories(data.categories ?? [])
          setNotes(data.notes ?? {})
          setFolders(data.folders ?? [])
          setPaperFolders(data.paperFolders ?? {})
        }
        setDataReady(true)
      } else {
        localStorage.removeItem(USER_CACHE_KEY)
        setUser(null)
        setKeywords([])
        setSaved([])
        setCategories([])
        setNotes({})
        setFolders([])
        setPaperFolders({})
        setPapers([])
      }
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user || !dataReady) return
    clearTimeout(writeTimerRef.current)
    writeTimerRef.current = setTimeout(() => {
      setDoc(doc(db, 'users', user.uid), {
        keywords,
        saved: saved.filter(p => !pendingRemoval.has(p.id)),
        categories, notes, folders, paperFolders,
      }, { merge: true })
    }, 800)
  }, [keywords, saved, pendingRemoval, categories, notes, folders, paperFolders, user, dataReady])

  useEffect(() => {
    function flush() {
      if (!user || !dataReady || pendingRemoval.size === 0) return
      setDoc(doc(db, 'users', user.uid), {
        saved: saved.filter(p => !pendingRemoval.has(p.id)),
      }, { merge: true })
    }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [user, dataReady, saved, pendingRemoval])

  async function handleLogin() {
    try { await signInWithPopup(auth, googleProvider) } catch {}
  }

  async function handleLogout() {
    clearInterval(timerRef.current)
    await signOut(auth)
  }

  async function load(kws, cats, resetList = false) {
    if (kws.length === 0) { setPapers([]); setOffset(0); setHasMore(false); return }
    setLoading(true); setError(null)
    try {
      const results = await fetchPapers(kws, cats, PAGE_SIZE, 0)
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
      const results = await fetchPapers(keywords, categories, PAGE_SIZE, offset)
      setPapers((prev) => [...prev, ...results])
      setOffset((prev) => prev + PAGE_SIZE)
      setHasMore(results.length === PAGE_SIZE)
    } catch (err) { setError(err.message) }
    finally { setLoadingMore(false) }
  }

  useEffect(() => {
    clearInterval(timerRef.current)
    load(keywords, categories, true)
    timerRef.current = setInterval(() => load(keywords, categories, false), POLL_INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  }, [keywords, categories])

  function addKeyword(e) {
    e.preventDefault()
    const kw = inputValue.trim().toLowerCase()
    if (!kw || keywords.includes(kw)) { setInputValue(''); return }
    setKeywords((prev) => [...prev, kw])
    setInputValue('')
  }

  function addCategory(cat) {
    if (!cat || categories.includes(cat)) return
    setCategories((prev) => [...prev, cat])
  }

  function toggleSave(paper) {
    if (pendingRemoval.has(paper.id)) {
      setPendingRemoval(prev => { const s = new Set(prev); s.delete(paper.id); return s })
    } else if (saved.some(p => p.id === paper.id)) {
      setPendingRemoval(prev => new Set([...prev, paper.id]))
    } else {
      setSaved(prev => [paper, ...prev])
    }
  }

  function updateNote(paperId, text) {
    setNotes((prev) => ({ ...prev, [paperId]: text }))
  }

  function updatePaperFolder(paperId, folderId) {
    setPaperFolders((prev) => {
      if (!folderId) { const pf = { ...prev }; delete pf[paperId]; return pf }
      return { ...prev, [paperId]: folderId }
    })
  }

  function addFolder(e) {
    e.preventDefault()
    const name = newFolderName.trim()
    if (!name) return
    setFolders((prev) => [...prev, { id: Date.now().toString(36), name }])
    setNewFolderName('')
    setAddingFolder(false)
  }

  function deleteFolder(folderId) {
    setFolders((prev) => prev.filter((f) => f.id !== folderId))
    setPaperFolders((prev) => {
      const pf = { ...prev }
      Object.keys(pf).forEach((pid) => { if (pf[pid] === folderId) delete pf[pid] })
      return pf
    })
    if (activeFolder === folderId) setActiveFolder(null)
  }

  const savedIds = new Set(saved.filter(p => !pendingRemoval.has(p.id)).map(p => p.id))

  const filteredSaved = saved.filter((p) => {
    if (activeFolder !== null && paperFolders[p.id] !== activeFolder) return false
    if (savedSearch) {
      const q = savedSearch.toLowerCase()
      return (
        p.title.toLowerCase().includes(q) ||
        p.abstract.toLowerCase().includes(q) ||
        (notes[p.id] ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

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
          <button className={tab === 'papers' ? 'tab active' : 'tab'} onClick={() => switchTab('papers')}>Papers</button>
          <button className={tab === 'saved' ? 'tab active' : 'tab'} onClick={() => switchTab('saved')}>
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

            <section className="category-section">
              <div className="section-label">Categories</div>
              <div className="keyword-chips keyword-chips--scroll">
                {categories.map((c) => <Chip key={c} label={c} onRemove={(c) => setCategories((prev) => prev.filter((x) => x !== c))} variant="cat" />)}
                {categories.length === 0 && (
                  <span className="chip-empty">All categories — select below to filter</span>
                )}
              </div>
              <CategoryPicker onSelect={addCategory} selected={categories} />
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

            <div className="paper-groups" key={paperKey}>
              {groupByDate(papers).map((group) => (
                <div key={group.date} className="date-group">
                  <div className="date-group-label">{formatDate(group.date)}</div>
                  <ul className="paper-list">
                    {group.papers.map((p, i) => (
                      <PaperItem key={p.id} paper={p} index={i} saved={savedIds.has(p.id)} onToggleSave={toggleSave} />
                    ))}
                  </ul>
                </div>
              ))}
              {!loading && papers.length === 0 && keywords.length > 0 && <p className="empty">No papers found.</p>}
              {keywords.length === 0 && <p className="empty">Add a keyword to get started.</p>}
            </div>

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
            <div className="saved-controls">
              <input
                className="saved-search"
                type="text"
                placeholder="Search saved papers…"
                value={savedSearch}
                onChange={(e) => setSavedSearch(e.target.value)}
              />
            </div>

            <div className="folder-tabs">
              <button
                className={`folder-tab${activeFolder === null ? ' active' : ''}`}
                onClick={() => setActiveFolder(null)}
              >All</button>
              {folders.map((f) => (
                <div key={f.id} className={`folder-tab${activeFolder === f.id ? ' active' : ''}`}>
                  <button className="folder-name-btn" onClick={() => setActiveFolder(f.id)}>{f.name}</button>
                  <button className="folder-delete" onClick={() => deleteFolder(f.id)} title="Delete folder">×</button>
                </div>
              ))}
              {addingFolder ? (
                <form className="new-folder-form" onSubmit={addFolder}>
                  <input
                    type="text"
                    placeholder="Folder name…"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    autoFocus
                    onBlur={() => { if (!newFolderName.trim()) setAddingFolder(false) }}
                  />
                  <button type="submit">+</button>
                </form>
              ) : (
                <button className="folder-add-btn" onClick={() => setAddingFolder(true)}>+ Folder</button>
              )}
            </div>

            <div className="status-bar">
              {filteredSaved.length !== saved.length
                ? `${filteredSaved.length} of ${saved.length} saved paper${saved.length !== 1 ? 's' : ''}`
                : `${saved.length} saved paper${saved.length !== 1 ? 's' : ''}`}
            </div>

            <div className="paper-groups">
              {groupByDate(filteredSaved).map((group) => (
                <div key={group.date} className="date-group">
                  <div className="date-group-label">{formatDate(group.date)}</div>
                  <ul className="paper-list">
                    {group.papers.map((p, i) => (
                      <SavedPaperItem
                        key={p.id}
                        paper={p}
                        index={i}
                        onToggleSave={toggleSave}
                        isPending={pendingRemoval.has(p.id)}
                        note={notes[p.id]}
                        onNoteChange={updateNote}
                        folders={folders}
                        folderId={paperFolders[p.id] ?? null}
                        onFolderChange={updatePaperFolder}
                      />
                    ))}
                  </ul>
                </div>
              ))}
              {saved.length === 0 && <p className="empty">No saved papers yet. Star a paper to save it.</p>}
              {saved.length > 0 && filteredSaved.length === 0 && <p className="empty">No papers match your filter.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
