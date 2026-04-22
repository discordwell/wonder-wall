/**
 * Node 25+ exposes a stub global `localStorage` that has no functional
 * setItem/getItem/clear (it only works when Node is launched with
 * --localstorage-file). That stub shadows whatever jsdom or happy-dom
 * installs, breaking any test that touches localStorage. Overwrite it
 * with a simple in-memory Map-backed Storage for the duration of tests.
 */

function makeStorage(): Storage {
  let map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear() { map = new Map(); },
    getItem(key: string) { return map.has(key) ? map.get(key)! : null; },
    setItem(key: string, value: string) { map.set(key, String(value)); },
    removeItem(key: string) { map.delete(key); },
    key(i: number) { return Array.from(map.keys())[i] ?? null; },
  };
}

Object.defineProperty(globalThis, 'localStorage', {
  value: makeStorage(),
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: makeStorage(),
  writable: true,
  configurable: true,
});
