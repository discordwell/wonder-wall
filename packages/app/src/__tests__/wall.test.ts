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

  // The Novastar auto-detect path (App.svelte) calls set() with columns/rows
  // taken straight from a server status / novastarResult message, and
  // parseServerMessage never shape-checks that wall object. So set() must be
  // the write-side counterpart to the load-side isValidDimensions guard: a
  // malformed value can't be allowed to make `totalPanels` NaN or persist
  // garbage. These cast through `unknown` to model the runtime values the typed
  // `number` signature can actually receive over the wire.
  it('set() rounds non-integer dimensions (e.g. derived from cabinet division)', async () => {
    const store = await freshStore();
    store.set(4.7, 3.2);
    expect(store.columns).toBe(5);
    expect(store.rows).toBe(3);
    expect(store.totalPanels).toBe(15);
  });

  it('set() clamps out-of-range dimensions instead of storing them', async () => {
    const store = await freshStore();
    store.set(0, -5);
    expect(store.columns).toBe(1);
    expect(store.rows).toBe(1);
    store.set(999999, 5);
    expect(store.columns).toBe(1000); // MAX_DIMENSION
    expect(store.rows).toBe(5);
  });

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['null', null],
    ['a string', '8'],
    ['undefined', undefined],
  ])('set() keeps the current value (not %s) and never yields NaN totalPanels', async (_label, bad) => {
    const store = await freshStore();
    store.set(6, 4); // known-good baseline
    store.set(bad as unknown as number, bad as unknown as number, true);
    expect(store.columns).toBe(6);
    expect(store.rows).toBe(4);
    expect(Number.isNaN(store.totalPanels)).toBe(false);
    expect(store.totalPanels).toBe(24);
    // And nothing NaN/garbage was persisted.
    const persisted = JSON.parse(localStorage.getItem('wonderwall-wall-config')!);
    expect(persisted).toEqual({ columns: 6, rows: 4 });
  });

  it('set() keeps the good field when only one dimension is malformed', async () => {
    const store = await freshStore();
    store.set(6, 4);
    store.set(8, NaN as unknown as number, true); // valid columns, garbage rows
    expect(store.columns).toBe(8);
    expect(store.rows).toBe(4); // preserved
    expect(store.totalPanels).toBe(32);
  });
});
