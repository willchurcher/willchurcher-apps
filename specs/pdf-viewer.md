# PDF Viewer Spec
> Source of truth: `src/PdfQuiz.tsx`, `src/pdfStorage.ts`
> Route: `/pdf` — component: `PdfQuiz` (default export)

---

## State machine
Two screens toggled by `viewer` state in root `PdfQuiz`:
- `viewer === null` → Library screen (`PdfLibrary`)
- `viewer !== null` → Viewer screen (`PdfViewer`)

---

## Library screen (`PdfLibrary`)

**Header:** `‹ Home` → navigate(`/`) | title: `PDF VIEWER` | `<HeaderRight />` (no options prop → shows "No options")

**Body (`.pdf-library`):** scrollable flex column, padding 1rem

**Empty state:** 📄 icon + "No saved PDFs yet"

**Doc list:** sorted newest-first (`addedAt` desc). Each `.card.pdf-library-card` (flex row):
- 📄 icon
- Name (truncated) + meta: `"{n} pages · "` (omitted if `pages === 0`) + formatted size (`KB` below 1 MB, `MB` above)
- 🗑 button — `stopPropagation`, calls `deletePdf(doc.id)`, removes from state
- Tap card body → `loadPdfData(doc.id)` → set `viewer` state → opens viewer

**`+ Add PDF` button** — triggers hidden `<input type="file" accept=".pdf">`.

**On file selected:**
1. `f.arrayBuffer()`
2. `savePdf(f.name, f.size, data)` → returns `id`
3. Push `{ id, name, size, pages: 0, addedAt: Date.now() }` to docs state
4. Immediately set viewer state (opens viewer without returning to library)

---

## Viewer screen (`PdfViewer`)

**Header:** `‹ Library` → `onBack()` | title: filename | `HeaderRight` with one option:
- `📝 Notes` (sidebar closed) / `✕ Hide notes` (sidebar open) — toggles `sidebarOpen`, calls `close()`

**Layout:**
```
.pdfquiz-viewer (overflow: auto both, flex: 1)
  .pdfquiz-row (display: flex, align-items: stretch, min-height: 100%)
    .pdfquiz-content (flex: 1, min-width: 0)   ← PDF pages
    .pdf-sidebar (width: 44px)                  ← only when sidebarOpen
```

**`effectiveWidth`** = `sidebarOpen ? viewerWidth - 44 : viewerWidth`
- `viewerWidth` tracked by `ResizeObserver` on `.pdfquiz-viewer`

**PDF rendering:**
- `react-pdf` `<Document file={data}>` where `data` is `ArrayBuffer`
- All pages rendered vertically, one after another in `.pdfquiz-page-wrap` divs
- `<Page width={effectiveWidth * renderScale} renderAnnotationLayer={false} renderTextLayer={true} />`
- On load success: `setNumPages(n)` + `onPagesLoaded(docId, n)` (which calls `updatePages` in IndexedDB)

**Pinch-to-zoom** (touch listeners on `.pdfquiz-viewer`):
- Scale range: 1.0–3.0 (`renderScale` state, `committedScale` ref)
- During gesture: CSS `scale()` + `transformOrigin` applied to `.pdfquiz-content` (visual only)
- On lift (`touchend`): clear transform, commit new scale, compute corrected scroll position, `setRenderScale` triggers re-render at new pixel width
- `gesturestart` / `gesturechange` blocked on `document` (`passive: false`) to prevent iOS conflicts

**Resize handling:**
- `ResizeObserver` captures `newWidth / oldWidth` ratio, scales `scrollLeft` and `scrollTop` proportionally before re-render (`pendingResizeScroll` ref + `requestAnimationFrame`)

**Notes loaded:** `listNotes(docId)` on mount, stored in `notes` state.

---

## Sidebar (`.pdf-sidebar`)

Width: 44px. `position: relative; overflow: visible; cursor: crosshair`.
`border-left: 1px solid var(--border); background: var(--surface)`.
Shares the same scroll container as the PDF — no JS sync needed.

**Tap empty space:**
```
yPos = e.clientY - viewerRef.getBoundingClientRect().top + viewerRef.scrollTop
```
Sets `creating = yPos`, opens NoteForm.

**Note pins (`.pdf-note-pin`):**
- 14px filled circle, `background: var(--accent)`, `border: 2px solid var(--bg)`
- `position: absolute; left: 50%; transform: translate(-50%, -50%)`
- `top: note.yPos * (effectiveWidth / (note.savedWidth ?? effectiveWidth))` — scales with viewport width so pins stay aligned after orientation change
- Tap → `setFlashcard(note)`
- Right-click / `contextMenu` → `confirm('Delete this note?')` → `deleteNote(note.id)`, remove from state

---

## NoteForm modal (two stages)

Reuses `.fc-overlay` / `.fc-card` / `.fc-face` / `.fc-badge` CSS (same as Flashcard).

**Stage `'q'` (default):**
- Q badge (accent colour)
- `<textarea autoFocus placeholder="Enter your question…">`
- Buttons: `Cancel` | `Next →` (disabled while textarea empty)
- `Next →` → sets stage to `'a'`

**Stage `'a'`:**
- A badge (muted colour)
- `<textarea autoFocus placeholder="Enter the answer…">`
- Buttons: `Cancel` | `Save` (disabled while textarea empty)
- `Save` → calls `onSave(q, a)` → `saveNote(docId, yPos, effectiveWidth, q, a)` → adds to `notes` state, closes form

**Tap backdrop (`.fc-overlay`)** → `onCancel()` → `setCreating(null)`

---

## Flashcard modal

**Overlay (`.fc-overlay`):** `position: fixed; inset: 0; padding: 20px; background: rgba(0,0,0,0.65)`.
`onClick={onClose}` — tap outside = close.

**Card (`.fc-card`):** `onClick={e => { e.stopPropagation(); setFlipped(v => !v) }}` — tap card = toggle flip.

**Q side (`.fc-face-q`):**
- Q badge (accent colour)
- Question text
- Hint: "tap card to reveal answer"

**A side (`.fc-face-a`):**
- A badge (muted colour, `--border-hi` bg)
- Answer text
- Hint: "tap outside to close"

Flipping is a toggle — tap again to go back to Q. Tap backdrop to close at any time.

---

## Storage (`src/pdfStorage.ts`)

**DB name:** `pdf-library` **version:** 2

| Store | keyPath | autoIncrement | Extra |
|---|---|---|---|
| `pdf-meta` | `id` | yes | — |
| `pdf-data` | `id` | no | same id as meta |
| `pdf-notes` | `id` | yes | index on `docId` |

**`PdfMeta`:** `{ id, name, size, pages, addedAt }`
**`PdfNote`:** `{ id, docId, yPos, savedWidth, question, answer, createdAt }`

| Function | Signature | Notes |
|---|---|---|
| `listPdfs` | `() → PdfMeta[]` | metadata only, no ArrayBuffer |
| `savePdf` | `(name, size, data) → id` | writes meta + data separately |
| `loadPdfData` | `(id) → ArrayBuffer` | loaded only when opening a doc |
| `updatePages` | `(id, pages)` | called on first successful render |
| `deletePdf` | `(id)` | deletes both meta and data stores |
| `listNotes` | `(docId) → PdfNote[]` | via docId index |
| `saveNote` | `(docId, yPos, savedWidth, q, a) → PdfNote` | |
| `deleteNote` | `(id)` | |
