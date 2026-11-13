// Log redaction. Pure, so it runs under `node --test`.

const PATTERNS: [RegExp, string][] = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]'],
  // JWT-shaped: three base64url parts starting with a JSON header.
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, '[token]'],
  [/\b(sk|whsec|rk)_(live|test)?_?[A-Za-z0-9]{8,}/g, '[secret]'],
  [/\bfake:[a-z_]+:[a-z_]+(:[^\s"']*)?/g, '[purchase-token]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]'],
];
const SECRET_KEYS = /token|authorization|password|secret|cookie|purchase|email/i;

export function redactText(s: string) {
  return PATTERNS.reduce((acc, [re, to]) => acc.replace(re, to), s);
}

/** Deep-copies a value for logging with secrets removed. Errors become { name, message }. */
export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return redactText(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth > 4) return '[…]';
  if (value instanceof Error) return { name: value.name, message: redactText(value.message) };
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = SECRET_KEYS.test(k) ? '[redacted]' : redact(v, depth + 1);
  return out;
}
