// IndexedDB helpers for PDF library
// Two stores:
//   pdf-meta — lightweight metadata (no ArrayBuffer)
//   pdf-data — the raw bytes, loaded only when opening a doc

const DB_NAME    = 'pdf-library'
const DB_VERSION = 1

export interface PdfMeta {
  id:      number
  name:    string
  size:    number   // bytes
  pages:   number   // 0 until first view
  addedAt: number   // Date.now()
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
  // Insert metadata first to get auto-generated id
  const metaId = await new Promise<number>((resolve, reject) => {
    const tx    = db.transaction('pdf-meta', 'readwrite')
    const store = tx.objectStore('pdf-meta')
    const req   = store.add({ name, size, pages: 0, addedAt: Date.now() })
    req.onsuccess = () => resolve(req.result as number)
    req.onerror   = () => reject(req.error)
  })
  // Insert data with same id
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
