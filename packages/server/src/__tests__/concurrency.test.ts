import { describe, it, expect } from 'vitest';
import { mapWithConcurrency } from '../services/concurrency.js';

describe('mapWithConcurrency', () => {
  it('never runs more than `limit` workers at once', async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 50 }, (_, i) => i);

    await mapWithConcurrency(items, 8, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 2));
      active -= 1;
    });

    expect(maxActive).toBeGreaterThan(0);
    expect(maxActive).toBeLessThanOrEqual(8);
  });

  it('processes every item and preserves input order', async () => {
    const items = [1, 2, 3, 4, 5];
    const out = await mapWithConcurrency(items, 2, async (n) => n * 10);
    expect(out).toEqual([10, 20, 30, 40, 50]);
  });

  it('handles an empty list', async () => {
    const out = await mapWithConcurrency([], 4, async (n) => n);
    expect(out).toEqual([]);
  });
});
