// Minimal IndexedDB helper (no extra library) for the offline features.
//
// Database: "ruralrise-offline" (version 1)
//   lessons          keyPath "id"   -> cached copies of GET /courses items
//   pendingProgress  keyPath "key"  -> one record per student+course (see progressQueue.js)
//   meta             keyPath "key"  -> small values such as when lessons were saved
//
// If you change the stores, bump DB_VERSION and add an upgrade step.

import { getApiBaseUrl } from '../common/apiClient.js';
// Scope public lessons and progress to the configured backend. Legacy queues
// remain untouched and are never silently replayed to a different server.
export const DB_NAME = `ruralrise-offline-v2:${getApiBaseUrl()}`;
export const DB_VERSION = 1;
export const STORE_LESSONS = 'lessons';
export const STORE_PROGRESS = 'pendingProgress';
export const STORE_META = 'meta';

let dbPromise = null;

export function isIndexedDbAvailable() {
  return typeof indexedDB !== 'undefined';
}

export function openOfflineDb() {
  if (dbPromise) return dbPromise;
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_LESSONS)) db.createObjectStore(STORE_LESSONS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
        const store = db.createObjectStore(STORE_PROGRESS, { keyPath: 'key' });
        store.createIndex('studentId', 'studentId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: 'key' });
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgraded the database: close so the upgrade can finish.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Could not open offline storage.'));
    };
  });
  return dbPromise;
}

/** Wraps an IDBRequest in a Promise. */
export function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Runs `work(stores)` inside one transaction and resolves with its return
 * value once the transaction has COMMITTED. Inside `work`, only await IDB
 * requests (via promisifyRequest); awaiting fetch() would auto-close the transaction.
 */
export async function runTransaction(storeNames, mode, work) {
  const db = await openOfflineDb();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  const tx = db.transaction(names, mode);
  const done = new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Offline storage transaction was aborted.'));
  });
  const stores = Object.fromEntries(names.map((name) => [name, tx.objectStore(name)]));
  let result;
  try {
    result = await work(stores);
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // Already finished.
    }
    await done.catch(() => {});
    throw error;
  }
  await done;
  return result;
}

/** Test helper: closes the cached connection so tests can start from a fresh database. */
export async function resetOfflineDbConnectionForTests() {
  if (dbPromise) {
    try {
      (await dbPromise).close();
    } catch {
      // ignore
    }
  }
  dbPromise = null;
}
