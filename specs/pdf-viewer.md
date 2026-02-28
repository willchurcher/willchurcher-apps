# PDF Viewer Spec

**Route**: `/pdf`
**Files**: `src/PdfQuiz.tsx`, `src/pdfStorage.ts`
**Library**: `react-pdf` (pdfjs worker auto-configured)

---

## Screens

### 1. Library Screen (default)
Shown when no PDF is open.

**Header**: `‹ Home` | `PDF VIEWER` | `HeaderRight` (no options → "No options")

**Body**:
- Scrollable list of saved PDF cards (newest first)
- Each card: 📄 icon · filename · page count · file size · 🗑 delete button
  - Tap card → open viewer
  - Tap 🗑 → delete PDF and all its notes from IndexedDB
- If no PDFs: empty state with 📄 icon and "No saved PDFs yet"
- `+ Add PDF` button at bottom → triggers hidden `<input type="file" accept=".pdf">`

**On file select**:
1. Read as `ArrayBuffer`
2. Save to IndexedDB (metadata + data separate stores)
3. Navigate directly to viewer

---

### 2. Viewer Screen
Shown when a PDF is open.

**Header**: `‹ Library` | `{filename}` | `HeaderRight` with options:
- `📝 Notes` / `✕ Hide notes` — toggles sidebar

**Body layout** (flex row inside scroll container):
```
[ PDF content (flex: 1) ] [ Sidebar (44px, optional) ]
```

**PDF rendering**:
- Uses `react-pdf` `<Document>` + `<Page>` components
- All pages rendered vertically (no pagination)
- `width = effectiveWidth * renderScale`
  - `effectiveWidth = viewerWidth - 44` when sidebar open, else `viewerWidth`
  - `renderScale` starts at 1.0; updated by pinch-to-zoom (range: 1.0–3.0)
- `renderAnnotationLayer: false`, `renderTextLayer: true`

**Pinch-to-zoom**:
- Two-finger touch → visual CSS `scale()` transform on content during gesture
- On lift: commits scale, re-renders pages at new width, restores scroll position
- iOS `gesturestart`/`gesturechange` blocked to prevent conflict

**Resize handling**:
- `ResizeObserver` on `.pdfquiz-viewer`
- Scroll position scaled by `newWidth / oldWidth` on resize

---

## Sidebar

**Toggle**: `···` menu → "📝 Notes" / "✕ Hide notes"

**Appearance**:
- 44px wide strip on the right
- Same scroll container as PDF — scrolls together
- `border-left: 1px solid var(--border)`; `cursor: crosshair`

**Note pins**:
- Rendered as small filled circles at `top: yPos * (effectiveWidth / note.savedWidth)`
  - Scaled so pins track correctly after viewport width changes (orientation, resize)
- Tap pin → opens **Flashcard**
- Long-press / right-click pin → confirm delete

**Creating a note**:
- Tap empty space in sidebar → compute `yPos = clientY - viewerRect.top + scrollTop`
- Opens **Note Form** modal

---

## Note Form (two-stage modal)

Reuses `.fc-card` / `.fc-face` styles (same card as flashcard).

**Stage 1 — Q badge**:
- Textarea: "Enter your question…"
- `Cancel` | `Next →` (disabled until text entered)

**Stage 2 — A badge**:
- Textarea: "Enter the answer…"
- `Cancel` | `Save` (disabled until text entered)

Tap backdrop → cancel.

---

## Flashcard

Full-screen overlay (`position: fixed; inset: 0; padding: 20px`).

**Stage 1 — Q side**:
- Q badge (accent colour)
- Question text
- Hint: "tap card to reveal answer"
- Tap card → flip to A side

**Stage 2 — A side**:
- A badge (muted colour)
- Answer text
- Hint: "tap outside to close"
- Tap card → flip back to Q side
- Tap backdrop → close

---

## Storage (`src/pdfStorage.ts`)

**DB**: `pdf-library` v2 (IndexedDB)

| Store | Key | Fields |
|---|---|---|
| `pdf-meta` | `id` (auto) | `name`, `size`, `pages`, `addedAt` |
| `pdf-data` | `id` (same as meta) | `data: ArrayBuffer` |
| `pdf-notes` | `id` (auto) | `docId`, `yPos`, `savedWidth`, `question`, `answer`, `createdAt` |

`pdf-notes` has an index on `docId`.
`pdf-meta` and `pdf-data` are separate so listing PDFs doesn't load binary data.

**API**:
- `listPdfs()` — metadata list only
- `savePdf(name, size, data)` → `id`
- `loadPdfData(id)` → `ArrayBuffer`
- `updatePages(id, pages)` — written on first successful render
- `deletePdf(id)` — deletes both meta and data stores
- `listNotes(docId)` → `PdfNote[]`
- `saveNote(docId, yPos, savedWidth, question, answer)` → `PdfNote`
- `deleteNote(id)`

---

## Planned / Future
- AI-assisted note generation (Claude API): generate Q&A from surrounding PDF page text
- Note editing (tap-hold pin → edit form)
- Note count badge on library card
