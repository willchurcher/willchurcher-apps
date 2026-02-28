// IndexedDB helpers for PDF library
// Stores:
//   pdf-meta  — lightweight metadata (no ArrayBuffer)
//   pdf-data  — the raw bytes, loaded only when opening a doc
//   pdf-notes — Q&A notes anchored by y-position within a doc

const DB_NAME    = 'pdf-library'
const DB_VERSION = 2

export interface PdfMeta {
  id:      number
  name:    string
  size:    number   // bytes
  pages:   number   // 0 until first view
  addedAt: number   // Date.now()
}

export interface PdfNote {
  id:       number
  docId:    number
  yPos:     number  // px from top of scrollable content
  question: string
  answer:   string
  createdAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('pdf-meta')) {
        db.createObjectStore('pdf-meta', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('pdf-data')) {
        db.createObjectStore('pdf-data', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('pdf-notes')) {
        const store = db.createObjectStore('pdf-notes', { keyPath: 'id', autoIncrement: true })
        store.createIndex('docId', 'docId')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

export async function listPdfs(): Promise<PdfMeta[]> {
  const db   = await openDB()
  const tx   = db.transaction('pdf-meta', 'readonly')
  const store = tx.objectStore('pdf-meta')
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result as PdfMeta[])
    req.onerror   = () => reject(req.error)
  })
}

export async function savePdf(
  name: string,
  size: number,
  data: ArrayBuffer,
): Promise<number> {
  const db = await openDB()
  const metaId = await new Promise<number>((resolve, reject) => {
    const tx    = db.transaction('pdf-meta', 'readwrite')
    const store = tx.objectStore('pdf-meta')
    const req   = store.add({ name, size, pages: 0, addedAt: Date.now() })
    req.onsuccess = () => resolve(req.result as number)
    req.onerror   = () => reject(req.error)
  })
  await new Promise<void>((resolve, reject) => {
    const tx    = db.transaction('pdf-data', 'readwrite')
    const store = tx.objectStore('pdf-data')
    const req   = store.add({ id: metaId, data })
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
  return metaId
}

export async function loadPdfData(id: number): Promise<ArrayBuffer> {
  const db    = await openDB()
  const tx    = db.transaction('pdf-data', 'readonly')
  const store = tx.objectStore('pdf-data')
  return new Promise((resolve, reject) => {
    const req = store.get(id)
    req.onsuccess = () => resolve((req.result as { id: number; data: ArrayBuffer }).data)
    req.onerror   = () => reject(req.error)
  })
}

export async function updatePages(id: number, pages: number): Promise<void> {
  const db    = await openDB()
  const tx    = db.transaction('pdf-meta', 'readwrite')
  const store = tx.objectStore('pdf-meta')
  const meta  = await new Promise<PdfMeta>((resolve, reject) => {
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result as PdfMeta)
    req.onerror   = () => reject(req.error)
  })
  meta.pages = pages
  await new Promise<void>((resolve, reject) => {
    const req = store.put(meta)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

export async function deletePdf(id: number): Promise<void> {
  const db = await openDB()
  await Promise.all([
    new Promise<void>((resolve, reject) => {
      const tx  = db.transaction('pdf-meta', 'readwrite')
      const req = tx.objectStore('pdf-meta').delete(id)
      req.onsuccess = () => resolve()
      req.onerror   = () => reject(req.error)
    }),
    new Promise<void>((resolve, reject) => {
      const tx  = db.transaction('pdf-data', 'readwrite')
      const req = tx.objectStore('pdf-data').delete(id)
      req.onsuccess = () => resolve()
      req.onerror   = () => reject(req.error)
    }),
  ])
}

// ── Notes ────────────────────────────────────────────────────────────────────

export async function listNotes(docId: number): Promise<PdfNote[]> {
  const db    = await openDB()
  const tx    = db.transaction('pdf-notes', 'readonly')
  const index = tx.objectStore('pdf-notes').index('docId')
  return new Promise((resolve, reject) => {
    const req = index.getAll(docId)
    req.onsuccess = () => resolve(req.result as PdfNote[])
    req.onerror   = () => reject(req.error)
  })
}

export async function saveNote(
  docId: number,
  yPos: number,
  question: string,
  answer: string,
): Promise<PdfNote> {
  const db = await openDB()
  const record = { docId, yPos, question, answer, createdAt: Date.now() }
  const id = await new Promise<number>((resolve, reject) => {
    const tx    = db.transaction('pdf-notes', 'readwrite')
    const store = tx.objectStore('pdf-notes')
    const req   = store.add(record)
    req.onsuccess = () => resolve(req.result as number)
    req.onerror   = () => reject(req.error)
  })
  return { id, ...record }
}

export async function deleteNote(id: number): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx  = db.transaction('pdf-notes', 'readwrite')
    const req = tx.objectStore('pdf-notes').delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}
