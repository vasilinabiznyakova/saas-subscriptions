export function normalizeUpperString(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const v = value.trim();
  return v.length === 0 ? undefined : v.toUpperCase();
}
