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

  // Valid JSON of the wrong shape parses fine but would make `config.columns`
  // throw (null) or `totalPanels` NaN (missing/non-numeric fields). Each must
  // fall back to the 4x3 default instead.
  it.each([
    ['null', 'null'],
    ['empty object', '{}'],
    ['array', '[6,4]'],
    ['missing rows', '{"columns":6}'],
    ['non-numeric', '{"columns":"6","rows":"4"}'],
    ['zero/negative', '{"columns":0,"rows":-3}'],
  ])('falls back to default for wrong-shape storage: %s', async (_label, stored) => {
    localStorage.setItem('wonderwall-wall-config', stored);
    const store = await freshStore();
    expect(() => store.columns).not.toThrow();
    expect(store.columns).toBe(4);
    expect(store.rows).toBe(3);
    expect(store.totalPanels).toBe(12);
  });

  it('set() survives a throwing localStorage (quota / private mode)', async () => {
    const store = await freshStore();
    const spy = vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => store.set(8, 5)).not.toThrow();
    expect(store.columns).toBe(8); // in-memory config still updated
    expect(store.rows).toBe(5);
    spy.mockRestore();
  });
});
