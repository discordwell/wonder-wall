import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAllPatterns } from '@wonderwall/patterns';

async function freshStore(wallOverrides?: { columns?: number; rows?: number }) {
  vi.resetModules();
  if (wallOverrides) {
    localStorage.setItem('wonderwall-wall-config', JSON.stringify({
      columns: wallOverrides.columns ?? 4,
      rows: wallOverrides.rows ?? 3,
    }));
  }
  return (await import('../lib/stores/pattern.svelte.ts')).patternStore;
}

describe('patternStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes to the first pattern with its defaults', async () => {
    const store = await freshStore();
    const first = getAllPatterns()[0];
    expect(store.current?.id).toBe(first.id);
    for (const p of first.parameters) {
      expect(store.params[p.key]).toBe(p.default);
    }
  });

  it('next() cycles forward and wraps around', async () => {
    const store = await freshStore();
    const all = getAllPatterns();
    const ids = [store.current!.id];
    for (let i = 1; i < all.length; i++) {
      store.next();
      ids.push(store.current!.id);
    }
    store.next(); // should wrap to first
    expect(store.current!.id).toBe(all[0].id);
    expect(new Set(ids).size).toBe(all.length); // visited all
  });

  it('prev() wraps backwards from the first pattern', async () => {
    const store = await freshStore();
    const all = getAllPatterns();
    store.prev();
    expect(store.current!.id).toBe(all[all.length - 1].id);
  });

  it('select() switches to the named pattern and resets params to its defaults', async () => {
    const store = await freshStore();
    store.setParam('color', '#ff00ff');
    store.select('solid');
    expect(store.current!.id).toBe('solid');
    // reset to defaults — 'solid' has a 'color' default of '#ff0000'
    expect(store.params.color).toBe('#ff0000');
  });

  it('select() applies current wall dimensions to patterns with columns/rows params', async () => {
    const store = await freshStore({ columns: 7, rows: 5 });
    store.select('numbered-grid');
    expect(store.params.columns).toBe(7);
    expect(store.params.rows).toBe(5);
  });

  it('select() on unknown id is a no-op', async () => {
    const store = await freshStore();
    const before = store.current!.id;
    store.select('does-not-exist');
    expect(store.current!.id).toBe(before);
  });

  it('setParam() preserves other keys', async () => {
    const store = await freshStore();
    store.select('numbered-grid');
    const prevRows = store.params.rows;
    store.setParam('columns', 12);
    expect(store.params.columns).toBe(12);
    expect(store.params.rows).toBe(prevRows);
  });
});
