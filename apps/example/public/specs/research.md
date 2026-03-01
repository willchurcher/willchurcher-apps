# Research Explorer Spec
> Route: `/research` — component: `Research` (default export from `src/Research.tsx`)

## Purpose

Search for academic papers, browse results with impact metrics, and add open-access PDFs directly to the PDF library. Only papers that can be added to the library are shown (open-access PDF available, or already in library).

## Data sources

Two APIs queried **in parallel** on every search. Results deduplicated by DOI.

### Semantic Scholar
```
GET https://api.semanticscholar.org/graph/v1/paper/search
  ?query={q}
  &fields=title,authors,year,abstract,citationCount,influentialCitationCount,
          openAccessPdf,externalIds,journal
  &limit=20
```
- No API key required (100 req/5 min per IP — avoid extra calls to stay within limit)
- `openAccessPdf.url` → `openAccessUrl`
- `externalIds.DOI` → deduplication key
- **No h-index fetching** — removed to avoid rate limiting SS API

### OpenAlex
```
GET https://api.openalex.org/works
  ?search={q}
  &select=id,title,authorships,publication_year,abstract_inverted_index,
          cited_by_count,open_access,doi,primary_location
  &per-page=20
```
- Fully open, no key required
- `open_access.oa_url` → `openAccessUrl`
- `doi` field (full URL form) → strip `https://doi.org/` prefix for dedup key
- Abstract stored as inverted index — reconstructed on client

### Deduplication & merge
1. Build a map keyed by normalised DOI (lowercase, no `https://doi.org/` prefix)
2. SS results take priority; OpenAlex supplements missing `abstract`, `journal`, `openAccessUrl`
3. Papers without DOI included as-is (cannot dedup)
4. SS results ranked 0–19 (`_idx`); OA results ranked 1000–1019 (lower rank = higher relevance)

### Result filtering
Only papers passing this predicate are shown:
```ts
p.openAccessUrl !== null || isInLibrary(p)
```
Papers without a free PDF and not in the library are silently excluded. Result count shows `{filtered} of {total} results`.

## Search cache

- Key: `research-cache` in `localStorage`
- Format: `Record<query_lowercase, { results, sourceNote, timestamp }>`
- TTL: **24 hours** from timestamp
- On search: check cache first → instant restore, no API calls on hit
- On miss: call APIs → write cache entry → prune expired entries
- Last query key: `research-last-query` in `localStorage`
- **On mount:** restore last query + results from cache (if still valid within 24hr)

## UI layout

```
<header class="page-header">
  ‹ Home | RESEARCH | <HeaderRight />
</header>
<div class="page-body research-page">
  <div class="research-search-bar">
    <input type="search" /> <button>Search</button>
  </div>
  <div class="research-controls">          ← only when results.length > 0
    Sort: [Relevance ▾]   12 of 20 results
  </div>
  <p class="research-source-note">…</p>   ← if one API failed
  <div class="research-results">
    {sorted.map(paper => <PaperCard />)}
  </div>
</div>
```

## Sort options

| Label | Sort key |
|---|---|
| Relevance | `_idx` asc (API rank, default) |
| Most cited | `citationCount` desc |
| Most influential | `influentialCitationCount` desc |
| Newest | `year` desc |
| Oldest | `year` asc |

## PaperCard

```
.card.paper-card
  .paper-card-header
    <h3 class="paper-title">Title</h3>
    <span class="paper-year">2023</span>
  .paper-card-meta
    Authors (≤3, then "et al.") · Journal · DOI ↗
  .paper-card-metrics
    💬 1,234   ⭐ 89 influential   (no h-index)
  [Show abstract ▾]                    ← toggle, only if abstract available
    Abstract text…
  .paper-card-actions
    [↗ Open DOI]   [+ Add to library | View in library]
[Upload PDF]                           ← appears below after auto-fetch error
<p class="paper-add-error">…</p>
```

## Add to library — button states

| State | Appearance | Behaviour |
|---|---|---|
| Not in library | `+ Add to library` (primary) | Fetch PDF → save → navigate to `/pdf?name=…` |
| Fetching | `Adding…` (disabled) | — |
| Fetch failed | Error message shown + **`Upload PDF`** button appears | Clears error, opens `<input type="file" accept=".pdf">` |
| Manual upload | File picker → read → save → navigate | Same save/navigate flow |
| In library | `View in library` (primary) | Navigate to `/pdf?name={savedName}` |

## Library name tracking

- `addedPapers: Map<paper.id, savedFilename>` — tracks names added this session (handles deduplication suffix)
- `libraryNames: Set<string>` — loaded from IndexedDB on mount via `listPdfs()`
- `isInLibrary(paper)` = `addedPapers.has(paper.id) || libraryNames.has(makePdfName(paper))`
- `getLibraryName(paper)` = `addedPapers.get(paper.id) ?? makePdfName(paper)`

## Filename derivation

```ts
function makePdfName(paper): string {
  const firstAuthor = paper.authors[0]?.name.split(' ').pop() ?? 'Unknown'
  const title = paper.title.slice(0, 60).replace(/[/\\:*?"<>|]/g, '').trim()
  return `${firstAuthor} - ${title} (${paper.year ?? 'n.d.'}).pdf`
}
```
If name already exists in IndexedDB, append ` (2)`, ` (3)`, etc.

## Error states

| Situation | UI |
|---|---|
| Both APIs fail | `"Search failed. Check your connection and try again."` |
| SS fails | Results shown + note: `"Semantic Scholar unavailable — showing OpenAlex results only."` |
| OA fails | Results shown + note: `"OpenAlex unavailable — showing Semantic Scholar results only."` |
| PDF fetch fails | Error inline on card + Upload PDF button |
| No results | `"No papers found for '{query}'. Try broader terms."` |

## Out of scope (for now)

- H-index (removed — causes rate limiting with 1 API call per visible card)
- Filtering by year, field, OA status
- Saved searches / history beyond the 24hr cache
- Author pages, citation graphs
- Proxy for CORS-blocked PDFs
