class IDBLayer {
  constructor() { this.db = null; }
  async init() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB nicht verfügbar'));
      const req = indexedDB.open('ble-scans-db', 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('records')) {
          db.createObjectStore('records', { keyPath: 'timestamp' });
        }
      };
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }
  async add(rec) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('records', 'readwrite');
      tx.objectStore('records').put(rec);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async getAll() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('records', 'readonly');
      const store = tx.objectStore('records');
      const req = store.getAll ? store.getAll() : store.openCursor();
      if (store.getAll) {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } else {
        const out = [];
        const curReq = store.openCursor();
        curReq.onsuccess = e => {
          const cursor = e.target.result;
          if (cursor) { out.push(cursor.value); cursor.continue(); } else { resolve(out); }
        };
        curReq.onerror = () => reject(curReq.error);
      }
    });
  }
  async clear() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('records', 'readwrite');
      tx.objectStore('records').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

class LSLayer {
  constructor() { this.prefix = 'ble-scan:'; }
  async init(){ if (!('localStorage' in window)) throw new Error('LocalStorage nicht verfügbar'); }
  async add(rec){ localStorage.setItem(this.prefix + rec.timestamp, JSON.stringify(rec)); }
  async getAll(){
    const out = [];
    for (let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) {
        try { out.push(JSON.parse(localStorage.getItem(k))); } catch {}
      }
    }
    out.sort((a,b)=> a.timestamp.localeCompare(b.timestamp));
    return out;
  }
  async clear(){
    const keys = [];
    for (let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }
}

export class StorageManager {
  constructor(statusCb = ()=>{}) {
    this.layer = null;
    this.memory = [];
    this.statusCb = statusCb;
  }
  async init() {
    try {
      const idb = new IDBLayer(); await idb.init(); this.layer = idb;
      this.statusCb('Speicherung: IndexedDB aktiv.');
      return;
    } catch (e) {
      this.statusCb('IndexedDB nicht verfügbar, versuche LocalStorage…');
    }
    try {
      const ls = new LSLayer(); await ls.init(); this.layer = ls;
      this.statusCb('Speicherung: LocalStorage aktiv.');
      return;
    } catch (e) {
      this.layer = null;
      this.statusCb('Speicherung nicht verfügbar. Arbeit im RAM (flüchtig).');
    }
  }
  async add(rec) {
    try {
      if (this.layer) return await this.layer.add(rec);
      this.memory.push(rec);
    } catch (e) {
      this.statusCb(`Speicherfehler: ${e.message}. Arbeit im RAM.`);
      this.layer = null;
      this.memory.push(rec);
    }
  }
  async getAll() {
    if (this.layer) {
      try { return await this.layer.getAll(); } catch {}
    }
    return [...this.memory];
  }
  async clear() {
    if (this.layer) {
      try { await this.layer.clear(); } catch {}
    }
    this.memory = [];
  }
}
