import type { PanelMap } from '../services/aruco.ts';

const DB_NAME = 'wonderwall';
const STORE_NAME = 'panel-maps';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function awaitTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

class MappingStore {
  maps = $state<PanelMap[]>([]);
  current = $state<PanelMap | null>(null);

  async load() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        this.maps = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async save(map: PanelMap) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(map);
    await awaitTransaction(tx);
    this.current = map;
    await this.load();
  }

  async remove(id: string) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    await awaitTransaction(tx);
    if (this.current?.id === id) this.current = null;
    await this.load();
  }

  exportJSON(map: PanelMap): string {
    return JSON.stringify(map, null, 2);
  }

  setCurrent(map: PanelMap | null) {
    this.current = map;
  }
}

export const mappingStore = new MappingStore();
