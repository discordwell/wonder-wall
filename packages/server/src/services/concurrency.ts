/**
 * Map over items with a bounded number of in-flight workers. A fixed pool of
 * `limit` runners pulls from a shared cursor, so at most `limit` worker
 * invocations are ever active at once — unlike `items.map(worker)` followed by
 * `Promise.all`, which starts every worker immediately.
 *
 * Results are returned in input order.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function runner(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      results[i] = await worker(items[i], i);
    }
  }

  const poolSize = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: poolSize }, () => runner()));
  return results;
}
