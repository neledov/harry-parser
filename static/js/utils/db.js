const DB_NAME = 'HarryDB';
const DB_VERSION = 1;
const STORE_NAME = 'harFiles';

export class HarDatabase {
    static async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    static async storeHarData(filename, data) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.put({
                filename,
                data,
                timestamp: Date.now()
            });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    static async getHarData(filename) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.getAll();
            
            request.onsuccess = () => {
                const file = request.result.find(item => item.filename === filename);
                resolve(file ? file.data : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    static async clearOldData(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
        const db = await this.init();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.getAll();
        
        request.onsuccess = () => {
            const now = Date.now();
            request.result.forEach(item => {
                if (now - item.timestamp > maxAge) {
                    store.delete(item.id);
                }
            });
        };
    }
}
