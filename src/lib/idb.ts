/**
 * IndexedDB storage helper for Keihi Pocket
 * - Manages persistent, large-capacity storage for application data
 * - Stores FileSystemFileHandle objects across sessions
 */

import { KeihiPocketData } from '@/types';

const DB_NAME = 'KeihiPocketDB';
const DB_VERSION = 1;
const STORE_DATA = 'app_data';
const STORE_HANDLES = 'file_handles';

const KEY_CURRENT_DATA = 'current_data';
const KEY_ACTIVE_HANDLE = 'active_handle';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser environment'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DATA)) {
        db.createObjectStore(STORE_DATA);
      }
      if (!db.objectStoreNames.contains(STORE_HANDLES)) {
        db.createObjectStore(STORE_HANDLES);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Save current app data to IndexedDB
 */
export async function saveAppDatatoIDB(data: KeihiPocketData): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DATA, 'readwrite');
      const store = tx.objectStore(STORE_DATA);
      const req = store.put(data, KEY_CURRENT_DATA);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save data to IndexedDB:', err);
  }
}

/**
 * Load app data from IndexedDB
 */
export async function loadAppDataFromIDB(): Promise<KeihiPocketData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DATA, 'readonly');
      const store = tx.objectStore(STORE_DATA);
      const req = store.get(KEY_CURRENT_DATA);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to load data from IndexedDB:', err);
    return null;
  }
}

export interface StoredHandleInfo {
  handle: FileSystemFileHandle;
  fileName: string;
  savedAt: string;
}

/**
 * Save FileSystemFileHandle to IndexedDB
 */
export async function saveFileHandleToIDB(
  handle: FileSystemFileHandle,
  fileName: string
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_HANDLES, 'readwrite');
      const store = tx.objectStore(STORE_HANDLES);
      const info: StoredHandleInfo = {
        handle,
        fileName,
        savedAt: new Date().toISOString(),
      };
      const req = store.put(info, KEY_ACTIVE_HANDLE);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save file handle to IndexedDB:', err);
  }
}

/**
 * Load FileSystemFileHandle from IndexedDB
 */
export async function loadFileHandleFromIDB(): Promise<StoredHandleInfo | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_HANDLES, 'readonly');
      const store = tx.objectStore(STORE_HANDLES);
      const req = store.get(KEY_ACTIVE_HANDLE);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to load file handle from IndexedDB:', err);
    return null;
  }
}

/**
 * Remove FileSystemFileHandle from IndexedDB (unlink file)
 */
export async function removeFileHandleFromIDB(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_HANDLES, 'readwrite');
      const store = tx.objectStore(STORE_HANDLES);
      const req = store.delete(KEY_ACTIVE_HANDLE);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to remove file handle from IndexedDB:', err);
  }
}
