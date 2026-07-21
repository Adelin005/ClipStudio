/**
 * IndexedDB helper pentru salvarea videourilor în Istoric
 */

const DB_NAME = 'ClipStudioHistory';
const DB_VERSION = 1;
const STORE = 'videos';

let db = null;

export async function openHistoryDB() {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

export async function saveVideoToHistory(entry) {
  const database = await openHistoryDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllHistoryVideos() {
  const database = await openHistoryDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('createdAt').getAll();
    req.onsuccess = () => {
      // Sortăm cel mai nou primul
      const results = req.result.sort((a, b) => b.createdAt - a.createdAt);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVideoFromHistory(id) {
  const database = await openHistoryDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearHistory() {
  const database = await openHistoryDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
