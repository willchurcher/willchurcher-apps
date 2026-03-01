import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeaderRight } from './HeaderRight'
import { listPdfs, savePdf } from './pdfStorage'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Author {
  name:     string
  authorId?: string  // Semantic Scholar author ID (for h-index)
}

interface PaperResult {
  _idx:                     number        // original API rank (for relevance sort)
  id:                       string
  doi:                      string | null
  title:                    string
  authors:                  Author[]
  year:                     number | null
  journal:                  string | null
  abstract:                 string | null
  citationCount:            number | null
  influentialCitationCount: number | null
  openAccessUrl:            string | null
  doiUrl:                   string | null
  source:                   'ss' | 'oa' | 'both'
}

type SortKey = 'relevance' | 'citations' | 'influential' | 'newest' | 'oldest'

// ── Search cache (localStorage, 24 hr TTL) ────────────────────────────────────

const CACHE_KEY      = 'research-cache'
const LAST_QUERY_KEY = 'research-last-query'
const CACHE_TTL      = 24 * 60 * 60 * 1000

interface CacheEntry {
  results:    PaperResult[]
  sourceNote: string | null
  timestamp:  number
}

function readCache(): Record<string, CacheEntry> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') } catch { return {} }
}

function getCached(query: string): CacheEntry | null {
  const entry = readCache()[query.toLowerCase()]
  if (!entry || Date.now() - entry.timestamp > CACHE_TTL) return null
  return entry
}

function setCached(query: string, entry: CacheEntry) {
  const cache = readCache()
  cache[query.toLowerCase()] = entry
  // Prune expired entries to keep storage tidy
  for (const k of Object.keys(cache)) {
    if (Date.now() - cache[k].timestamp > CACHE_TTL) delete cache[k]
  }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch { /* storage full */ }
}

// ── API helpers ───────────────────────────────────────────────────────────────

function invertedIndexToAbstract(inv: Record<string, number[]>): string {
  const words: string[] = []
  for (const [word, positions] of Object.entries(inv)) {
    for (const pos of positions) words[pos] = word
  }
  return words.filter(Boolean).join(' ')
}

function normalizeDoi(doi: string | null | undefined): string | null {
  if (!doi) return null
  return doi.replace(/^https?:\/\/doi\.org\//i, '').toLowerCase()
}

async function searchSemanticScholar(query: string): Promise<PaperResult[]> {
  const fields = 'title,authors,year,abstract,citationCount,influentialCitationCount,openAccessPdf,externalIds,journal'
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=${fields}&limit=20`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Semantic Scholar failed')
  const json = await res.json()
  return (json.data ?? []).map((p: any, i: number): PaperResult => ({
    _idx:                     i,
    id:                       p.paperId,
    doi:                      normalizeDoi(p.externalIds?.DOI),
    title:                    p.title ?? 'Untitled',
    authors:                  (p.authors ?? []).map((a: any) => ({ name: a.name, authorId: a.authorId })),
    year:                     p.year ?? null,
    journal:                  p.journal?.name ?? null,
    abstract:                 p.abstract ?? null,
    citationCount:            p.citationCount ?? null,
    influentialCitationCount: p.influentialCitationCount ?? null,
    openAccessUrl:            p.openAccessPdf?.url ?? null,
    doiUrl:                   p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : null,
    source:                   'ss',
  }))
}

async function searchOpenAlex(query: string): Promise<PaperResult[]> {
  const select = 'id,title,authorships,publication_year,abstract_inverted_index,cited_by_count,open_access,doi,primary_location'
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&select=${select}&per-page=20`
  const res = await fetch(url)
  if (!res.ok) throw new Error('OpenAlex failed')
  const json = await res.json()
  return (json.results ?? []).map((p: any, i: number): PaperResult => {
    const doi = normalizeDoi(p.doi)
    return {
      _idx:                     1000 + i,  // ranked after SS for relevance
      id:                       p.id,
      doi,
      title:                    p.title ?? 'Untitled',
      authors:                  (p.authorships ?? []).map((a: any) => ({ name: a.author?.display_name ?? '' })),
      year:                     p.publication_year ?? null,
      journal:                  p.primary_location?.source?.display_name ?? null,
      abstract:                 p.abstract_inverted_index
                                  ? invertedIndexToAbstract(p.abstract_inverted_index)
                                  : null,
      citationCount:            p.cited_by_count ?? null,
      influentialCitationCount: null,
      openAccessUrl:            p.open_access?.oa_url ?? null,
      doiUrl:                   doi ? `https://doi.org/${doi}` : null,
      source:                   'oa',
    }
  })
}

function mergeResults(ss: PaperResult[], oa: PaperResult[]): PaperResult[] {
  const byDoi = new Map<string, PaperResult>()
  const noDoi: PaperResult[] = []

  for (const p of ss) {
    if (p.doi) byDoi.set(p.doi, p)
    else noDoi.push(p)
  }
  for (const p of oa) {
    if (p.doi && byDoi.has(p.doi)) {
      const existing = byDoi.get(p.doi)!
      byDoi.set(p.doi, {
        ...existing,
        source:       'both',
        abstract:     existing.abstract     ?? p.abstract,
        journal:      existing.journal      ?? p.journal,
        openAccessUrl: existing.openAccessUrl ?? p.openAccessUrl,
      })
    } else if (p.doi) {
      byDoi.set(p.doi, p)
    } else {
      noDoi.push(p)
    }
  }
  return [...byDoi.values(), ...noDoi]
}

function sortResults(results: PaperResult[], key: SortKey): PaperResult[] {
  const arr = [...results]
  switch (key) {
    case 'relevance':   arr.sort((a, b) => a._idx - b._idx); break
    case 'citations':   arr.sort((a, b) => (b.citationCount ?? -1) - (a.citationCount ?? -1)); break
    case 'influential': arr.sort((a, b) => (b.influentialCitationCount ?? -1) - (a.influentialCitationCount ?? -1)); break
    case 'newest':      arr.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)); break
    case 'oldest':      arr.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999)); break
  }
  return arr
}

// ── Filename helpers ──────────────────────────────────────────────────────────

function makePdfName(paper: PaperResult): string {
  const firstAuthor = paper.authors[0]?.name.split(' ').pop() ?? 'Unknown'
  const title = paper.title.slice(0, 60).replace(/[/\\:*?"<>|]/g, '').trim()
  const year = paper.year ?? 'n.d.'
  return `${firstAuthor} - ${title} (${year}).pdf`
}

function makeUniqueName(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  const stem = base.endsWith('.pdf') ? base.slice(0, -4) : base
  for (let i = 2; i < 200; i++) {
    const candidate = `${stem} (${i}).pdf`
    if (!existing.has(candidate)) return candidate
  }
  return `${stem} (${Date.now()}).pdf`
}

function formatAuthors(authors: Author[]): string {
  if (authors.length === 0) return 'Unknown authors'
  if (authors.length <= 3) return authors.map(a => a.name).join(', ')
  return `${authors.slice(0, 3).map(a => a.name).join(', ')} et al.`
}

// ── PaperCard ─────────────────────────────────────────────────────────────────

function PaperCard({ paper, libraryName, onAdd, onUpload }: {
  paper:       PaperResult
  libraryName: string | null   // non-null = in library, this is the saved filename
  onAdd:       (paper: PaperResult) => Promise<void>
  onUpload:    (paper: PaperResult, file: File) => Promise<void>
}) {
  const navigate     = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [adding,   setAdding]   = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const handleAdd = async () => {
    setAdding(true)
    setAddError(null)
    try {
      await onAdd(paper)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add')
      setAdding(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAdding(true)
    setAddError(null)
    try {
      await onUpload(paper, file)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to upload')
      setAdding(false)
    }
  }

  return (
    <div className="card paper-card">
      <div className="paper-card-header">
        <h3 className="paper-title">{paper.title}</h3>
        <span className="paper-year">{paper.year ?? 'n.d.'}</span>
      </div>

      <div className="paper-card-meta">
        <span className="paper-authors">{formatAuthors(paper.authors)}</span>
        {paper.journal && <span className="paper-journal"> · {paper.journal}</span>}
        {paper.doiUrl && (
          <a className="paper-doi-link" href={paper.doiUrl} target="_blank" rel="noreferrer"> · DOI ↗</a>
        )}
      </div>

      <div className="paper-card-metrics">
        <span title="Total citations">💬 {paper.citationCount?.toLocaleString() ?? '—'}</span>
        {paper.influentialCitationCount !== null && (
          <span title="Influential citations">⭐ {paper.influentialCitationCount}</span>
        )}
      </div>

      {paper.abstract && (
        <>
          {expanded && <p className="paper-abstract">{paper.abstract}</p>}
          <button className="paper-expand-btn" onClick={() => setExpanded(v => !v)}>
            {expanded ? 'Hide abstract ▴' : 'Show abstract ▾'}
          </button>
        </>
      )}

      <div className="paper-card-actions">
        {paper.doiUrl && (
          <a className="btn paper-doi-btn" href={paper.doiUrl} target="_blank" rel="noreferrer">
            ↗ Open DOI
          </a>
        )}

        {libraryName !== null ? (
          <button
            className="btn btn-primary paper-add-btn"
            onClick={() => navigate(`/pdf?name=${encodeURIComponent(libraryName)}`)}
          >
            View in library
          </button>
        ) : (
          <>
            <button className="btn btn-primary paper-add-btn" onClick={handleAdd} disabled={adding}>
              {adding ? 'Adding…' : '+ Add to library'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {addError && (
              <button
                className="btn paper-upload-btn"
                onClick={() => { setAddError(null); fileInputRef.current?.click() }}
                disabled={adding}
              >
                Upload PDF
              </button>
            )}
          </>
        )}
      </div>

      {addError && <p className="paper-add-error">{addError}</p>}
    </div>
  )
}

// ── Research page ─────────────────────────────────────────────────────────────

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'relevance',   label: 'Relevance' },
  { key: 'citations',   label: 'Most cited' },
  { key: 'influential', label: 'Most influential' },
  { key: 'newest',      label: 'Newest' },
  { key: 'oldest',      label: 'Oldest' },
]

export default function Research() {
  const navigate = useNavigate()

  const [query,      setQuery]      = useState('')
  const [results,    setResults]    = useState<PaperResult[]>([])
  const [loading,    setLoading]    = useState(false)
  const [searched,   setSearched]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [sourceNote, setSourceNote] = useState<string | null>(null)
  const [sortBy,       setSortBy]       = useState<SortKey>('relevance')
  // paper.id → saved filename (papers added this session)
  const [addedPapers,  setAddedPapers]  = useState<Map<string, string>>(new Map())
  const [libraryNames, setLibraryNames] = useState<Set<string>>(new Set())

  useEffect(() => {
    listPdfs().then(docs => setLibraryNames(new Set(docs.map(d => d.name))))

    // Restore last search from cache on mount
    const lastQuery = localStorage.getItem(LAST_QUERY_KEY) ?? ''
    if (!lastQuery) return
    const cached = getCached(lastQuery)
    if (!cached) return
    setQuery(lastQuery)
    setResults(cached.results)
    setSourceNote(cached.sourceNote)
    setSearched(true)
  }, [])

  const search = async () => {
    const q = query.trim()
    if (!q) return

    // Cache hit — instant restore
    const cached = getCached(q)
    if (cached) {
      setResults(cached.results)
      setSourceNote(cached.sourceNote)
      setSearched(true)
      setError(null)
      localStorage.setItem(LAST_QUERY_KEY, q)
      return
    }

    setLoading(true)
    setError(null)
    setSourceNote(null)
    setResults([])
    setSearched(false)

    const [ssResults, oaResults] = await Promise.all([
      searchSemanticScholar(q).catch(() => null),
      searchOpenAlex(q).catch(() => null),
    ])

    setLoading(false)
    setSearched(true)

    if (!ssResults && !oaResults) {
      setError('Search failed. Check your connection and try again.')
      return
    }

    const note = !ssResults ? 'Semantic Scholar unavailable — showing OpenAlex results only.'
               : !oaResults  ? 'OpenAlex unavailable — showing Semantic Scholar results only.'
               : null
    const merged = mergeResults(ssResults ?? [], oaResults ?? [])

    setSourceNote(note)
    setResults(merged)
    setCached(q, { results: merged, sourceNote: note, timestamp: Date.now() })
    localStorage.setItem(LAST_QUERY_KEY, q)
  }

  const saveAndNavigate = async (paper: PaperResult, data: ArrayBuffer) => {
    const base = makePdfName(paper)
    const allNames = new Set([...libraryNames, ...addedPapers.values()])
    const name = makeUniqueName(base, allNames)
    await savePdf(name, data.byteLength, data)
    setAddedPapers(prev => new Map(prev).set(paper.id, name))
    navigate(`/pdf?name=${encodeURIComponent(name)}`)
  }

  const handleAdd = async (paper: PaperResult) => {
    if (!paper.openAccessUrl) throw new Error('No open-access PDF')
    let data: ArrayBuffer
    try {
      const res = await fetch(paper.openAccessUrl)
      if (!res.ok) throw new Error()
      data = await res.arrayBuffer()
    } catch {
      throw new Error('Could not fetch PDF — try uploading manually')
    }
    await saveAndNavigate(paper, data)
  }

  const handleUpload = async (paper: PaperResult, file: File) => {
    const data = await file.arrayBuffer()
    await saveAndNavigate(paper, data)
  }

  // Returns the saved filename if the paper is in the library, null otherwise
  const getLibraryName = (paper: PaperResult): string | null => {
    if (addedPapers.has(paper.id)) return addedPapers.get(paper.id)!
    const base = makePdfName(paper)
    if (libraryNames.has(base)) return base
    return null
  }

  const sorted = sortResults(
    results.filter(p => p.openAccessUrl || getLibraryName(p) !== null),
    sortBy,
  )

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>‹ Home</button>
          <span className="page-header-title">Research</span>
        </div>
        <HeaderRight />
      </header>

      <div className="page-body research-page">
        <div className="research-search-bar">
          <input
            className="research-input"
            type="search"
            placeholder="e.g. FX market making, options pricing…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button
            className="btn btn-primary"
            onClick={search}
            disabled={loading || !query.trim()}
          >
            {loading ? '…' : 'Search'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="research-controls">
            <div className="research-sort">
              <span className="research-sort-label">Sort:</span>
              <select
                className="research-sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortKey)}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
            <span className="research-count">{sorted.length} of {results.length} results</span>
          </div>
        )}

        {sourceNote && <p className="research-source-note">{sourceNote}</p>}
        {error      && <p className="research-error">{error}</p>}
        {loading    && <div className="research-loading">Searching…</div>}

        {!loading && searched && results.length === 0 && !error && (
          <div className="research-empty">No papers found for "{query}". Try broader terms.</div>
        )}

        <div className="research-results">
          {sorted.map(paper => (
            <PaperCard
              key={paper.id}
              paper={paper}
              libraryName={getLibraryName(paper)}
              onAdd={handleAdd}
              onUpload={handleUpload}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
