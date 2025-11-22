import { HistoryItem } from '../types';

const DB_NAME = 'StyleAI_DB';
const STORE_NAME = 'history';
const DB_VERSION = 1;

// Open Database Connection
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const storage = {
  // Get all history items
  async getAll(): Promise<HistoryItem[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const result = request.result as HistoryItem[];
          // Sort by timestamp descending (newest first)
          result.sort((a, b) => b.timestamp - a.timestamp);
          resolve(result);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to get history from DB:", error);
      return [];
    }
  },

  // Add or Update an item
  async save(item: HistoryItem): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(item); // 'put' updates if exists, adds if not
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Delete an item by ID
  async delete(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Delete multiple items (e.g., for pruning)
  async deleteMultiple(ids: string[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        let completed = 0;
        let errors = false;
        
        if (ids.length === 0) {
            resolve();
            return;
        }

        ids.forEach(id => {
            const req = store.delete(id);
            req.onsuccess = () => {
                completed++;
                if (completed === ids.length) resolve();
            };
            req.onerror = () => {
                errors = true;
            };
        });
    });
  },

  // Clear non-favorite items
  async clearNonFavorites(): Promise<void> {
     const db = await openDB();
     return new Promise((resolve, reject) => {
       const transaction = db.transaction(STORE_NAME, 'readwrite');
       const store = transaction.objectStore(STORE_NAME);
       const request = store.openCursor();
       
       request.onsuccess = (event) => {
         const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
         if (cursor) {
           const item = cursor.value as HistoryItem;
           if (!item.isFavorite) {
             cursor.delete();
           }
           cursor.continue();
         } else {
           resolve();
         }
       };
       request.onerror = () => reject(request.error);
     });
  }
};