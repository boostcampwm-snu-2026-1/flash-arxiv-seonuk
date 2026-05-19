const BASE = '/arxiv/api/query'

export async function fetchPapers(keywords, maxResults = 20, start = 0) {
  const query = keywords.map((k) => `all:"${k}"`).join(' AND ')
  const params = new URLSearchParams({
    search_query: query,
    sortBy: 'submittedDate',
    sortOrder: 'descending',
    max_results: maxResults,
    start,
  })

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error(`arXiv API error: ${res.status}`)

  const text = await res.text()
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
