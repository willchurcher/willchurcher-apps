# Specs Viewer Spec
> Route: `/specs` — component: `Specs` (default export from `src/Specs.tsx`)

## Purpose

Browse and read the spec files for each app, with full typographic control over the reading experience.

## Spec files

Stored as static markdown files at `apps/example/public/specs/`. Served at `/specs/{key}.md` at runtime.

When adding a new spec:
1. Write the `.md` file to `/specs/` (repo root)
2. Copy it to `apps/example/public/specs/`
3. Add an entry to the `SPECS` array in `Specs.tsx`

| Key | Label | Icon |
|---|---|---|
| `global-styles` | Global Styles | 🎨 |
| `pdf-viewer` | PDF Viewer | 📄 |
| `research` | Research | 🔬 |
| `specs` | Specs | 📖 |

## Navigation

Uses `useSearchParams` — no sub-routing needed:
- `/specs` → spec list (landing page)
- `/specs?file={key}` → spec detail view

Back button in header:
- On list: `‹ Home` → `navigate('/')`
- On detail: `‹ Specs` → `setSearchParams({})`

## Markdown rendering

Uses `marked` (`Marked` class for isolated per-render instances). Raw text stored in state; re-parsed via `useMemo` whenever raw text or any setting changes — changes apply instantly without re-fetching.

Post-processing applied to rendered HTML (not via renderer overrides):
- `showHr: false` → strip `<hr>` tags
- `linksNewTab: true` → inject `target="_blank" rel="noreferrer"` on all `<a>` tags
- `headingAnchors: false` → inject `<a class="specs-anchor" href="#{id}">#</a>` after h2–h6 text

## Settings

Persisted to `localStorage` under key `specs-settings`. Loaded on mount, defaulting to `DEFAULTS` for any missing key.

### Typography (sliders)

| Setting | Default | Range | Unit |
|---|---|---|---|
| `fontSize` | 0.88 | 0.68–1.20 | rem |
| `lineHeight` | 1.65 | 1.10–2.20 | — |
| `sidePadding` | 1.00 | 0–2.50 | rem |
| `h1Size` | 1.80 | 1.20–2.80 | rem |
| `h2Size` | 1.05 | 0.82–1.60 | rem |
| `h3Size` | 0.92 | 0.75–1.40 | rem |
| `paragraphGap` | 0.75 | 0.10–1.50 | rem |
| `listIndent` | 1.40 | 0.50–3.00 | rem |

Applied as CSS custom properties (`--sm-fs`, `--sm-lh`, `--sm-side`, `--sm-h1`, `--sm-h2`, `--sm-h3`, `--sm-pg`, `--sm-li`) on `.specs-content`. Referenced in CSS rules via `var(--sm-*)`.

### Marked options (toggles)

| Setting | Default | Effect |
|---|---|---|
| `gfm` | `true` | GitHub Flavored Markdown (tables, strikethrough, task lists) |
| `breaks` | `false` | Single newline → `<br>` |
| `linksNewTab` | `true` | Open all links in new tab |
| `showHr` | `false` | Show `---` horizontal rule dividers |
| `headingAnchors` | `false` | Add `#` anchor links to h2–h6 |

## Options panel (··· menu)

Scrollable panel (`max-height: 65vh; overflow-y: auto`), two sections:

**Typography** — one slider row per numeric setting. Each row shows label + live value (`0.88rem`).

**Markdown** — one toggle row per boolean setting. Each row shows label, short description, and On/Off button.

**Actions row:** Reset (→ `DEFAULTS`) | Save as default (→ `localStorage`)

"Saved as default" shows a brief toast at the bottom of the screen for 1.5s.

## CSS architecture

- `.specs-content` — sets `--sm-*` vars; `padding: 1rem var(--sm-side)` for top/bottom + dynamic sides
- `.specs-markdown` — inherits font-size and line-height from `--sm-*`; all heading/paragraph/list rules reference their respective vars
- Code blocks: `font-size: 0.82em` (relative to body, scales with `--sm-fs`)
- Tables: `font-size: 0.9em` (relative)
