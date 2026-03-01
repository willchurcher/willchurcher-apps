# Research Explorer Spec
> Route: `/research` — component: `Research` (default export from `src/Research.tsx`)

---

## Purpose

Search for academic papers on a topic (e.g. "market making", "FX microstructure"),
browse results with impact metrics, and add open-access PDFs directly to the PDF library.

---

## Data sources

Two APIs queried **in parallel** for every search. Results deduplicated by DOI.

### Semantic Scholar
```
GET https://api.semanticscholar.org/graph/v1/paper/search
  ?query={q}
  &fields=title,authors,year,abstract,citationCount,influentialCitationCount,
          openAccessPdf,externalIds,journal,publicationDate
  &limit=20
```
- No API key required for moderate use (100 req/5 min per IP)
- `openAccessPdf.url` is the free PDF link when available
- `externalIds.DOI` is the deduplication key
- `authors[0].authorId` used to fetch h-index (see below)

### OpenAlex
```
GET https://api.openalex.org/works
  ?search={q}
  &select=id,title,authorships,publication_year,abstract_inverted_index,
          cited_by_count,open_access,doi,primary_location,biblio
  &per-page=20
```
- Fully open, no key required
- `open_access.oa_url` is the free PDF link when available
- `doi` field (full URL form `https://doi.org/10.xxxx`) → strip prefix for dedup key
- Abstract is stored as an inverted index — reconstruct on client:
  ```ts
  function invertedIndexToAbstract(inv: Record<string, number[]>): string {
    const words: string[] = []
    for (const [word, positions] of Object.entries(inv)) {
      for (const pos of positions) words[pos] = word
    }
    return words.join(' ')
  }
  ```

### Deduplication & merge
1. Collect all results from both APIs
2. Build a map keyed by DOI (lowercased, stripped of `https://doi.org/` prefix)
3. If a DOI appears in both: keep Semantic Scholar record, supplement missing fields from OpenAlex
4. Papers without a DOI cannot be deduplicated — include all, mark source as `'ss'` | `'oa'` | `'both'`
5. Sort merged list by the active sort criterion before rendering

---

## H-index (lazy, per visible card)

H-index comes from Semantic Scholar's author endpoint:
```
GET https://api.semanticscholar.org/graph/v1/author/{authorId}?fields=hIndex
```
- Fetch only for the **first author** of each paper
- Triggered lazily: fetch when card scrolls into view (IntersectionObserver)
- Cache results in a `Map<authorId, hIndex>` in component state to avoid re-fetching
- Show `—` while loading, actual value once resolved
- OpenAlex-only papers (no Semantic Scholar authorId): show `—` permanently

---

## UI layout

### Page structure
```
<AppPage> (sticky header: ‹ Home | RESEARCH | HeaderRight)
  <div class="research-page">
    <div class="research-search-bar">
      <input type="search" placeholder="Search papers…" />
      <button>Search</button>
    </div>
    <div class="research-controls">   ← sort + result count
      Sort: [Relevance ▾]   20 results
    </div>
    <div class="research-results">
      {results.map(paper => <PaperCard />)}
    </div>
  </div>
```

### Sort options (dropdown or segmented control)
| Label | Sort key |
|---|---|
| Relevance | API-returned order (default) |
| Most cited | `citationCount` desc |
| Most influential | `influentialCitationCount` desc |
| Newest | `year` desc |
| Oldest | `year` asc |
| Author h-index | `hIndex` desc (first author) |

### PaperCard
```
.card.paper-card
  .paper-card-header
    <h3 class="paper-title">Title</h3>
    <span class="paper-year">2023</span>
  .paper-card-meta
    Authors (first 3, then "et al.") · Journal/venue · DOI link ↗
  .paper-card-metrics
    💬 1,234 citations  ·  ⭐ 89 influential  ·  h: 42
  .paper-card-abstract   ← collapsed by default, tap to expand
    Abstract text…
  .paper-card-actions
    [↗ Open DOI]   [+ Add to library]    ← or: [+ Add to library (no PDF)]
```

**"+ Add to library" button states:**
- **Available PDF:** enabled, primary accent style. On click → fetch PDF → save to IndexedDB → navigate to `/pdf?name={filename}`
- **No free PDF:** disabled, muted style. Tooltip: "No open-access PDF — open DOI to find full text". DOI button still shown.
- **Loading (fetching PDF):** spinner in button, disabled during fetch
- **Already in library:** label changes to "✓ In library", disabled, green tint. (Check by name match on mount / after add.)

---

## Adding a paper to the PDF library

1. User clicks "+ Add to library"
2. Fetch the PDF bytes from `openAccessPdf.url` or `open_access.oa_url`
   - Use a CORS proxy if direct fetch fails (note: may need proxy for some sources)
   - On fetch failure: show error toast "Could not fetch PDF — try opening the DOI link directly"
3. Derive a filename: `"{Author} - {Title} ({Year}).pdf"` — truncate title to 60 chars
4. Ensure uniqueness in IndexedDB:
   - `listPdfs()` → check existing names
   - If name already exists, append ` (2)`, ` (3)`, etc.
5. `savePdf(name, size, data)` → returns `id`
6. Navigate to `/pdf?name={encodeURIComponent(name)}`

---

## PDF viewer URL scheme change (required prerequisite)

Currently the PDF viewer has no URL params — it always opens the library screen.

**Change:** Read `?name` query param on mount. If present, find the doc in IndexedDB by name and open it directly.

```ts
// In PdfQuiz.tsx (root component), on mount:
const params = new URLSearchParams(window.location.search)
const nameParam = params.get('name')
if (nameParam) {
  const docs = await listPdfs()
  const match = docs.find(d => d.name === nameParam)
  if (match) {
    const data = await loadPdfData(match.id)
    setViewer({ id: match.id, data, name: match.name })
  }
}
```

**Name uniqueness in IndexedDB:** enforced at save time (suffix numbering). Since names are unique, name-based lookup is safe.

---

## State

```ts
interface PaperResult {
  id:                     string          // DOI or SS paperId or OA id
  doi:                    string | null
  title:                  string
  authors:                Author[]        // { name, authorId? }
  year:                   number | null
  journal:                string | null
  abstract:               string | null
  citationCount:          number | null
  influentialCitationCount: number | null
  openAccessUrl:          string | null   // direct PDF URL if available
  doiUrl:                 string | null   // https://doi.org/{doi}
  source:                 'ss' | 'oa' | 'both'
}

// Component state
query:        string
results:      PaperResult[]
loading:      boolean
error:        string | null
sortBy:       'relevance' | 'citations' | 'influential' | 'newest' | 'oldest' | 'hindex'
hIndexCache:  Map<string, number>         // authorId → hIndex
libraryNames: Set<string>                 // names already in IndexedDB (for "✓ In library")
addingId:     string | null               // paperId currently being fetched+saved
```

---

## Error states

| Situation | UI |
|---|---|
| Both APIs fail | Error card: "Search failed. Check your connection and try again." |
| One API fails | Results shown, small notice: "Results from Semantic Scholar only" (or OpenAlex only) |
| PDF fetch fails | Toast: "Could not download PDF — try the DOI link instead" |
| No results | Empty state: "No papers found for '{query}'. Try broader terms." |

---

## CORS considerations

Semantic Scholar and OpenAlex both support CORS — direct browser fetch works fine.
PDF files may not — many publisher PDFs block cross-origin requests even for open-access URLs.
For MVP, attempt direct fetch; on failure show error toast with DOI fallback.
A future improvement could route PDF fetches through a small Vercel serverless function.

---

## Home page entry

Add to the apps list on the Home page:
```
{ name: 'Research', path: '/research', description: 'Search papers & add to PDF library' }
```

---

## Out of scope (for now)

- Books (revisit as separate tab once papers flow is solid)
- Saved searches / search history
- Filtering by year range, field, or open-access only
- Author pages
- Citation graph / related papers
- Vercel proxy for CORS-blocked PDFs
