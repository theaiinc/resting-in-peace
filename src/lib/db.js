// Static, client-side storage backed by IndexedDB (no server required).
// Falls back to an in-memory store when IndexedDB is unavailable
// (private windows, blocked site data, sandboxed previews).

const DB_NAME = 'resting-in-peace'
const DB_VERSION = 1
export const STORES = ['places', 'tracks', 'audio']

let dbPromise = null
const memory = Object.fromEntries(STORES.map(s => [s, new Map()]))

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        for (const s of STORES) {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        console.warn('IndexedDB unavailable, using in-memory storage:', req.error)
        resolve(null)
      }
    } catch (err) {
      console.warn('IndexedDB unavailable, using in-memory storage:', err)
      resolve(null)
    }
  })
  return dbPromise
}

function run(store, mode, fn) {
  return openDB().then(db => {
    if (!db) return fn(null)
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode)
      const req = fn(tx.objectStore(store))
      tx.oncomplete = () => resolve(req ? req.result : undefined)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  })
}

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function getAll(store) {
  const result = await run(store, 'readonly', os => (os ? os.getAll() : null))
  return result ?? [...memory[store].values()]
}

export async function get(store, id) {
  const result = await run(store, 'readonly', os => (os ? os.get(id) : null))
  return result ?? memory[store].get(id) ?? null
}

export async function put(store, record) {
  await run(store, 'readwrite', os => {
    if (os) return os.put(record)
    memory[store].set(record.id, record)
    return null
  })
  return record
}

export async function remove(store, id) {
  await run(store, 'readwrite', os => {
    if (os) return os.delete(id)
    memory[store].delete(id)
    return null
  })
}
