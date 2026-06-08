const BASE = '/arxiv/api/query'

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

let lastRequestTime = 0

async function request(params, retries = 3) {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < 5000) await delay(5000 - elapsed)
  lastRequestTime = Date.now()

  const res = await fetch(`${BASE}?${params}`)
  if (res.status === 429) {
    if (retries === 0) throw new Error('arXiv rate limit — try again in a moment')
    await delay(10000)
    lastRequestTime = 0
    return request(params, retries - 1)
  }
  if (!res.ok) throw new Error(`arXiv API error: ${res.status}`)
  return res.text()
}

export async function fetchPapers(keywords, categories = [], maxResults = 20, start = 0) {
  const parts = []
  if (keywords.length > 0) {
    parts.push(keywords.map((k) => `(ti:"${k}" OR abs:"${k}" OR au:"${k}")`).join(' AND '))
  }
  if (categories.length > 0) {
    parts.push(`(${categories.map((c) => `cat:${c}`).join(' OR ')})`)
  }
  const query = parts.join(' AND ')

  const params = new URLSearchParams({
    search_query: query,
    sortBy: 'submittedDate',
    sortOrder: 'descending',
    max_results: maxResults,
    start,
  })

  const text = await request(params)
  return parseAtom(text)
}

function parseAtom(xml) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  const entries = Array.from(doc.querySelectorAll('entry'))

  return entries.map((entry) => {
    const id = entry.querySelector('id')?.textContent?.split('/abs/').pop() ?? ''
    const title = entry.querySelector('title')?.textContent?.trim().replace(/\s+/g, ' ') ?? ''
    const abstract = entry.querySelector('summary')?.textContent?.trim().replace(/\s+/g, ' ') ?? ''
    const published = entry.querySelector('published')?.textContent?.slice(0, 10) ?? ''
    const url = `https://arxiv.org/abs/${id}`
    return { id, title, abstract, date: published, url }
  })
}
