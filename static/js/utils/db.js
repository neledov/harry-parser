const DB_NAME = 'HarryDB';
const DB_VERSION = 3; // Increased for schema update
const STORE_NAME = 'harFiles';

export class HarDatabase {
    static async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                let store;
                
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    store = db.createObjectStore(STORE_NAME, { 
                        keyPath: ['filename', 'requestUrl'] 
                    });
                } else {
                    store = event.target.transaction.objectStore(STORE_NAME);
                }
                
                if (!store.indexNames.contains('filename')) {
                    store.createIndex('filename', 'filename', { unique: false });
                }
                if (!store.indexNames.contains('requestUrl')) {
                    store.createIndex('requestUrl', 'requestUrl', { unique: false });
                }
            };
        });
    }

    static async storeHarData(filename, data) {
        const db = await this.init();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        return Promise.all(data.map(async entry => {
            const requestUrl = entry.request.url;
            
            // Check if this exact request already exists
            const existingKey = await new Promise(resolve => {
                const getRequest = store.get([filename, requestUrl]);
                getRequest.onsuccess = () => resolve(getRequest.result);
            });

            if (!existingKey) {
                return new Promise((resolve, reject) => {
                    const request = store.put({
                        filename,
                        requestUrl,
                        data: entry,
                        timestamp: Date.now()
                    });
                    
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            }
        }));
    }

    static async getAllByFilename(filename) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('filename');
            const request = index.getAll(filename);
            
            request.onsuccess = () => {
                const items = request.result;
                // Sort by timestamp and extract the data
                const sortedData = items
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map(item => item.data);
                resolve(sortedData);
            };
            request.onerror = () => reject(request.error);
        });
    }

    static async getHarData(filename) {
        const items = await this.getAllByFilename(filename);
        return items.length > 0 ? items : null;
    }

    static async clearOldData(maxAge = 24 * 60 * 60 * 1000) {
        const db = await this.init();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.getAll();
        
        request.onsuccess = () => {
            const now = Date.now();
            request.result.forEach(item => {
                if (now - item.timestamp > maxAge) {
                    store.delete([item.filename, item.requestUrl]);
                }
            });
        };
    }
}
