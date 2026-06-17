import type { PatternParameter, TestPattern } from './types.js';

/**
 * Read a typed value from a params bag, falling back if the key is missing
 * or the value is the wrong primitive type. The `typeof` check protects
 * patterns from malformed WebSocket-relayed params (e.g. number-as-string)
 * that would otherwise reach canvas math as NaN.
 *
 * Numbers are additionally required to be finite: `typeof NaN === 'number'`
 * and `typeof Infinity === 'number'`, so a non-finite value would otherwise
 * slip the type check and corrupt downstream math.
 */
export function getParam<T extends string | number | boolean>(
  params: Record<string, unknown>,
  key: string,
  fallback: T,
): T {
  const v = params[key];
  if (typeof v !== typeof fallback) return fallback;
  if (typeof v === 'number' && !Number.isFinite(v)) return fallback;
  return v as T;
}

/**
 * Coerce a single raw value to a declared parameter's contract: right type,
 * within its declared [min, max], integer when the default is integral, and a
 * valid choice for selects. Anything that can't be made valid falls back to the
 * parameter's default.
 */
function sanitizeValue(p: PatternParameter, value: unknown): string | number | boolean {
  switch (p.type) {
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return p.default;
      let n = value;
      if (typeof p.min === 'number') n = Math.max(p.min, n);
      if (typeof p.max === 'number') n = Math.min(p.max, n);
      // Grid counts, step counts, pixel sizes etc. are conceptually integral —
      // mirror that when the declared default is an integer.
      if (Number.isInteger(p.default)) n = Math.round(n);
      return n;
    }
    case 'boolean':
      return typeof value === 'boolean' ? value : (p.default as boolean);
    case 'select': {
      const options = p.options ?? [];
      // Accept an exact match, or a stringified match (the UI sends the option's
      // declared value, but a relayed message may carry "75" vs 75). Always
      // return the canonical declared value so downstream type checks hold.
      const match = options.find(
        (o) => o.value === value || String(o.value) === String(value),
      );
      return match ? match.value : p.default;
    }
    case 'color':
      return typeof value === 'string' && value.length > 0 ? value : (p.default as string);
    default:
      return p.default;
  }
}

/**
 * Produce a params bag that is safe to render with, given a pattern's declared
 * parameter contract. Every declared parameter is coerced into range; unknown
 * keys are dropped. This is the single enforcement point for the `min`/`max`
 * bounds that pattern definitions declare — without it, a malformed or hostile
 * WebSocket message can drive a render into an infinite loop (e.g. crosshatch
 * `spacing: 0`/negative), a divide-by-zero (`steps: 1`), or a pathological
 * iteration count (`columns: 100000`). Render entry points and the server
 * relay both pass external params through here.
 */
export function sanitizeParams(
  pattern: Pick<TestPattern, 'parameters'>,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of pattern.parameters) {
    out[p.key] = sanitizeValue(p, raw[p.key]);
  }
  return out;
}
