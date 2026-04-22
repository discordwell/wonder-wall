/**
 * Read a typed value from a params bag, falling back if the key is missing
 * or the value is the wrong primitive type. The `typeof` check protects
 * patterns from malformed WebSocket-relayed params (e.g. number-as-string)
 * that would otherwise reach canvas math as NaN.
 */
export function getParam<T extends string | number | boolean>(
  params: Record<string, unknown>,
  key: string,
  fallback: T,
): T {
  const v = params[key];
  return typeof v === typeof fallback ? (v as T) : fallback;
}
