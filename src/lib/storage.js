// src/lib/storage.js

class StorageManager {
  constructor() {
    this.storageType = this.detectBestStorage();
  }

  detectBestStorage() {
    // Test storage availability and capabilities
    const storageTests = [
      { type: 'localStorage', available: this.isLocalStorageAvailable() },
      { type: 'sessionStorage', available: this.isSessionStorageAvailable() },
      { type: 'indexedDB', available: this.isIndexedDBAvailable() },
      { type: 'memory', available: true }, // Always available as fallback
    ];

    // Return the first available storage type
    return storageTests.find(test => test.available)?.type || 'memory';
  }

  isLocalStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  isSessionStorageAvailable() {
    try {
      const test = '__storage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  isIndexedDBAvailable() {
    try {
      return 'indexedDB' in window && indexedDB !== null;
    } catch {
      return false;
    }
  }

  // Generic storage interface
  async setItem(key, value, options = {}) {
    const { expiry, encrypted = false, storage = this.storageType } = options;
    
    const data = {
      value,
      timestamp: Date.now(),
      expiry: expiry ? Date.now() + expiry : null,
      encrypted,
    };

    const serialized = JSON.stringify(data);
    const finalValue = encrypted ? this.encrypt(serialized) : serialized;

    switch (storage) {
      case 'localStorage':
        return this.setLocalStorage(key, finalValue);
      case 'sessionStorage':
        return this.setSessionStorage(key, finalValue);
      case 'indexedDB':
        return this.setIndexedDB(key, finalValue);
      case 'memory':
        return this.setMemoryStorage(key, finalValue);
      default:
        throw new Error(`Unsupported storage type: ${storage}`);
    }
  }

  async getItem(key, options = {}) {
    const { storage = this.storageType } = options;
    
    let rawValue;
    switch (storage) {
      case 'localStorage':
        rawValue = this.getLocalStorage(key);
        break;
      case 'sessionStorage':
        rawValue = this.getSessionStorage(key);
        break;
      case 'indexedDB':
        rawValue = await this.getIndexedDB(key);
        break;
      case 'memory':
        rawValue = this.getMemoryStorage(key);
        break;
      default:
        throw new Error(`Unsupported storage type: ${storage}`);
    }

    if (!rawValue) return null;

    try {
      let data;
      try {
        data = JSON.parse(rawValue);
      } catch {
        // Handle non-JSON data (legacy or plain strings)
        return rawValue;
      }

      // Check expiry
      if (data.expiry && Date.now() > data.expiry) {
        await this.removeItem(key, { storage });
        return null;
      }

      // Decrypt if needed
      if (data.encrypted) {
        const decryptedValue = this.decrypt(data.value);
        return JSON.parse(decryptedValue);
      }

      return data.value;
    } catch (error) {
      console.error('Error parsing stored data:', error);
      return null;
    }
  }

  async removeItem(key, options = {}) {
    const { storage = this.storageType } = options;
    
    switch (storage) {
      case 'localStorage':
        return this.removeLocalStorage(key);
      case 'sessionStorage':
        return this.removeSessionStorage(key);
      case 'indexedDB':
        return this.removeIndexedDB(key);
      case 'memory':
        return this.removeMemoryStorage(key);
      default:
        throw new Error(`Unsupported storage type: ${storage}`);
    }
  }

  async clear(options = {}) {
    const { storage = this.storageType } = options;
    
    switch (storage) {
      case 'localStorage':
        return localStorage.clear();
      case 'sessionStorage':
        return sessionStorage.clear();
      case 'indexedDB':
        return this.clearIndexedDB();
      case 'memory':
        return this.clearMemoryStorage();
      default:
        throw new Error(`Unsupported storage type: ${storage}`);
    }
  }

  // LocalStorage methods
  setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('LocalStorage error:', error);
      return false;
    }
  }

  getLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('LocalStorage error:', error);
      return null;
    }
  }

  removeLocalStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('LocalStorage error:', error);
      return false;
    }
  }

  // SessionStorage methods
  setSessionStorage(key, value) {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('SessionStorage error:', error);
      return false;
    }
  }

  getSessionStorage(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error('SessionStorage error:', error);
      return null;
    }
  }

  removeSessionStorage(key) {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('SessionStorage error:', error);
      return false;
    }
  }

  // Memory storage (fallback)
  memoryStorage = new Map();

  setMemoryStorage(key, value) {
    this.memoryStorage.set(key, value);
    return true;
  }

  getMemoryStorage(key) {
    return this.memoryStorage.get(key) || null;
  }

  removeMemoryStorage(key) {
    return this.memoryStorage.delete(key);
  }

  clearMemoryStorage() {
    this.memoryStorage.clear();
    return true;
  }

  // IndexedDB methods
  async initIndexedDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SaasChatbotDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage');
        }
      };
    });
  }

  async setIndexedDB(key, value) {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      store.put(value, key);
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('IndexedDB error:', error);
      return false;
    }
  }

  async getIndexedDB(key) {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const request = store.get(key);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB error:', error);
      return null;
    }
  }

  async removeIndexedDB(key) {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      store.delete(key);
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('IndexedDB error:', error);
      return false;
    }
  }

  async clearIndexedDB() {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      store.clear();
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('IndexedDB error:', error);
      return false;
    }
  }

  // Encryption methods (basic implementation)
  encrypt(data) {
    if (import.meta.env.DEV) {
      // Simple base64 encoding for development
      return btoa(data);
    }
    
    // Use Web Crypto API for production
    return this.cryptoEncrypt(data);
  }

  decrypt(encryptedData) {
    if (import.meta.env.DEV) {
      try {
        return atob(encryptedData);
      } catch {
        return encryptedData;
      }
    }
    
    return this.cryptoDecrypt(encryptedData);
  }

  async cryptoEncrypt(data) {
    try {
      const key = await this.getCryptoKey();
      const encoded = new TextEncoder().encode(data);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
      );
      
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption error:', error);
      return data; // Fallback to unencrypted
    }
  }

  async cryptoDecrypt(encryptedData) {
    try {
      const key = await this.getCryptoKey();
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedData; // Fallback
    }
  }

  async getCryptoKey() {
    if (this.cryptoKey) return this.cryptoKey;

    const keyData = new TextEncoder().encode(
      import.meta.env.VITE_CRYPTO_KEY || 'default-key-change-in-production'
    );
    
    this.cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
    
    return this.cryptoKey;
  }

  // Utility methods
  async getStorageInfo() {
    const info = {
      type: this.storageType,
      available: {
        localStorage: this.isLocalStorageAvailable(),
        sessionStorage: this.isSessionStorageAvailable(),
        indexedDB: this.isIndexedDBAvailable(),
      },
      usage: {},
    };

    // Get storage usage information
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        info.usage = {
          quota: estimate.quota,
          usage: estimate.usage,
          available: estimate.quota - estimate.usage,
        };
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    }

    return info;
  }

  async clearExpired() {
    // This would need to be implemented based on storage type
    // For now, just clear memory storage expired items
    const keys = Array.from(this.memoryStorage.keys());
    for (const key of keys) {
      try {
        const item = await this.getItem(key);
        if (item === null) {
          // Item was expired and removed by getItem
          console.log(`Removed expired item: ${key}`);
        }
      } catch (error) {
        console.error(`Error checking expiry for ${key}:`, error);
      }
    }
  }
}

// Create singleton instance
export const storageManager = new StorageManager();

// Convenience functions
export const setItem = (key, value, options) => storageManager.setItem(key, value, options);
export const getItem = (key, options) => storageManager.getItem(key, options);
export const removeItem = (key, options) => storageManager.removeItem(key, options);
export const clear = (options) => storageManager.clear(options);
export const getStorageInfo = () => storageManager.getStorageInfo();

export default storageManager;
