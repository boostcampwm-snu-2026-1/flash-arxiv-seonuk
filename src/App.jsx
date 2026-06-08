import { useState, useEffect, useRef } from 'react'
import { fetchPapers } from './api/arxiv'
import './App.css'

const POLL_INTERVAL_MS = 60000
const PAGE_SIZE = 300
const KW_KEY = 'research-helper-keywords'
const SAVED_KEY = 'research-helper-saved'
const CAT_KEY = 'research-helper-categories'
const NOTES_KEY = 'research-helper-notes'
const FOLDERS_KEY = 'research-helper-folders'
const PFOLD_KEY = 'research-helper-paper-folders'

function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    if (v) return JSON.parse(v)
  } catch {}
  return fallback
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return {
    monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    year: d.getFullYear(),
  }
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

function PaperItem({ paper, saved, onToggleSave, index }) {
  const [bounce, setBounce] = useState(false)
  const { monthDay, year } = formatDate(paper.date)

  return (
    <li className="paper-item" style={{ animationDelay: `${Math.min(index, 40) * 30}ms` }}>
      <button
        className={`scrap-btn${saved ? ' scrapped' : ''}${bounce ? ' bounce' : ''}`}
        onClick={() => { setBounce(true); onToggleSave(paper) }}
        onAnimationEnd={() => setBounce(false)}
        aria-label={saved ? 'Remove from saved' : 'Save paper'}
        title={saved ? 'Remove from saved' : 'Save'}
      >
        {saved ? '★' : '☆'}
      </button>
      <span className="date">
        <span className="date-md">{monthDay}</span>
        <span className="date-yr">{year}</span>
      </span>
      <a className="paper-title" href={paper.url} target="_blank" rel="noreferrer">{paper.title}</a>
      {paper.abstract && <div className="abstract-tooltip">{paper.abstract}</div>}
    </li>
  )
}

function SavedPaperItem({ paper, onToggleSave, note, onNoteChange, folders, folderId, onFolderChange, index }) {
  const [bounce, setBounce] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const { monthDay, year } = formatDate(paper.date)

  return (
    <li className="paper-item saved-item" style={{ animationDelay: `${Math.min(index, 40) * 30}ms` }}>
      <div className="saved-row">
        <button
          className={`scrap-btn scrapped${bounce ? ' bounce' : ''}`}
          onClick={() => { setBounce(true); onToggleSave(paper) }}
          onAnimationEnd={() => setBounce(false)}
          aria-label="Remove from saved"
          title="Remove from saved"
        >★</button>
        <span className="date">
          <span className="date-md">{monthDay}</span>
          <span className="date-yr">{year}</span>
        </span>
        <a className="paper-title" href={paper.url} target="_blank" rel="noreferrer">{paper.title}</a>
        <button
          className={`note-btn${note ? ' has-note' : ''}`}
          onClick={() => setShowNote((v) => !v)}
          title={note ? 'Edit note' : 'Add note'}
        >✎</button>
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
      {showNote && (
        <textarea
          className="note-area"
          placeholder="Add a note…"
          value={note ?? ''}
          onChange={(e) => onNoteChange(paper.id, e.target.value)}
          rows={3}
        />
      )}
      {paper.abstract && <div className="abstract-tooltip">{paper.abstract}</div>}
    </li>
  )
}

export default function App() {
  const [tab, setTab] = useState('papers')
  const [keywords, setKeywords] = useState(() => loadLS(KW_KEY, []))
  const [inputValue, setInputValue] = useState('')
  const [categories, setCategories] = useState(() => loadLS(CAT_KEY, []))
  const [catInput, setCatInput] = useState('')
  const [papers, setPapers] = useState([])
  const [paperKey, setPaperKey] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [saved, setSaved] = useState(() => loadLS(SAVED_KEY, []))
  const [notes, setNotes] = useState(() => loadLS(NOTES_KEY, {}))
  const [folders, setFolders] = useState(() => loadLS(FOLDERS_KEY, []))
  const [paperFolders, setPaperFolders] = useState(() => loadLS(PFOLD_KEY, {}))
  const [activeFolder, setActiveFolder] = useState(null)
  const [savedSearch, setSavedSearch] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [addingFolder, setAddingFolder] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => { localStorage.setItem(KW_KEY, JSON.stringify(keywords)) }, [keywords])
  useEffect(() => { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)) }, [saved])
  useEffect(() => { localStorage.setItem(CAT_KEY, JSON.stringify(categories)) }, [categories])
  useEffect(() => { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)) }, [notes])
  useEffect(() => { localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders)) }, [folders])
  useEffect(() => { localStorage.setItem(PFOLD_KEY, JSON.stringify(paperFolders)) }, [paperFolders])

  async function load(kws, cats, resetList = false) {
    if (kws.length === 0) { setPapers([]); setOffset(0); setHasMore(false); return }
    setLoading(true)
    setError(null)
    try {
      const results = await fetchPapers(kws, cats, PAGE_SIZE, 0)
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
      const results = await fetchPapers(keywords, categories, PAGE_SIZE, offset)
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

  function removeKeyword(kw) {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }

  function addCategory(e) {
    e.preventDefault()
    const cat = catInput.trim()
    if (!cat || categories.includes(cat)) { setCatInput(''); return }
    setCategories((prev) => [...prev, cat])
    setCatInput('')
  }

  function removeCategory(cat) {
    setCategories((prev) => prev.filter((c) => c !== cat))
  }

  function toggleSave(paper) {
    const isSaved = saved.some((p) => p.id === paper.id)
    if (isSaved) {
      setSaved((prev) => prev.filter((p) => p.id !== paper.id))
      setNotes((prev) => { const n = { ...prev }; delete n[paper.id]; return n })
      setPaperFolders((prev) => { const pf = { ...prev }; delete pf[paper.id]; return pf })
    } else {
      setSaved((prev) => [paper, ...prev])
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

  const savedIds = new Set(saved.map((p) => p.id))

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

  return (
    <div className="app">
      <header>
        <h1>
          Seonuk's Interactive Research Helper
          <a className="header-mail-btn" href="mailto:iamseonuk@gmail.com" title="Contact">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <polyline points="2,4 12,13 22,4"/>
            </svg>
          </a>
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
                {keywords.map((kw) => <Chip key={kw} label={kw} onRemove={removeKeyword} />)}
                {keywords.length === 0 && <span className="chip-empty">No keywords yet — add one below</span>}
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

            <section className="category-section">
              <div className="section-label">Categories</div>
              <div className="keyword-chips">
                {categories.map((c) => <Chip key={c} label={c} onRemove={removeCategory} variant="cat" />)}
                {categories.length === 0 && (
                  <span className="chip-empty">All categories — add one to filter (e.g. eess.AS, cs.LG)</span>
                )}
              </div>
              <form className="keyword-form" onSubmit={addCategory}>
                <input
                  type="text"
                  placeholder="Add category (e.g. eess.AS)…"
                  value={catInput}
                  onChange={(e) => setCatInput(e.target.value)}
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
              {!loading && papers.length === 0 && keywords.length > 0 && <li className="empty">No papers found.</li>}
              {keywords.length === 0 && <li className="empty">Add a keyword to get started.</li>}
            </ul>

            {hasMore && !loading && (
              <div className="load-more-wrap">
                <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? (
                    <><span className="dot" /><span className="dot" /><span className="dot" /></>
                  ) : 'Load more'}
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

            <ul className="paper-list">
              {filteredSaved.map((p, i) => (
                <SavedPaperItem
                  key={p.id}
                  paper={p}
                  index={i}
                  onToggleSave={toggleSave}
                  note={notes[p.id]}
                  onNoteChange={updateNote}
                  folders={folders}
                  folderId={paperFolders[p.id] ?? null}
                  onFolderChange={updatePaperFolder}
                />
              ))}
              {saved.length === 0 && <li className="empty">No saved papers yet. Star a paper to save it.</li>}
              {saved.length > 0 && filteredSaved.length === 0 && <li className="empty">No papers match your filter.</li>}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
