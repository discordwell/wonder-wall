import { describe, it, expect, beforeEach, vi } from 'vitest';

async function freshStore() {
  vi.resetModules();
  return (await import('../lib/stores/wall.svelte.ts')).wallStore;
}

describe('wallStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to 4x3 when storage is empty', async () => {
    const store = await freshStore();
    expect(store.columns).toBe(4);
    expect(store.rows).toBe(3);
    expect(store.totalPanels).toBe(12);
    expect(store.autoDetected).toBe(false);
  });

  it('loads saved dimensions from storage', async () => {
    localStorage.setItem('wonderwall-wall-config', JSON.stringify({ columns: 6, rows: 4 }));
    const store = await freshStore();
    expect(store.columns).toBe(6);
    expect(store.rows).toBe(4);
    expect(store.totalPanels).toBe(24);
  });

  it('set() persists and updates getters', async () => {
    const store = await freshStore();
    store.set(8, 5);
    expect(store.columns).toBe(8);
    expect(store.rows).toBe(5);
    expect(JSON.parse(localStorage.getItem('wonderwall-wall-config')!)).toEqual({ columns: 8, rows: 5 });
  });

  it('set(auto=true) marks autoDetected', async () => {
    const store = await freshStore();
    store.set(4, 3, true);
    expect(store.autoDetected).toBe(true);
    store.set(6, 4, false);
    expect(store.autoDetected).toBe(false);
  });

  it('recovers from corrupt storage', async () => {
    localStorage.setItem('wonderwall-wall-config', '{not json');
    const store = await freshStore();
    expect(store.columns).toBe(4);
    expect(store.rows).toBe(3);
  });
});
