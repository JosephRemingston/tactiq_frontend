// Input and link validation. Pure (no React Native imports) so it runs under `node --test`.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Concept keys ("zone-14") and metric keys ("pressing.ppda"): lowercase words joined by - _ or a single dot. */
const SLUG = /^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID.test(v);
}

export function isSlugKey(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 80 && SLUG.test(v);
}

/** A route parameter that must be one of a fixed set; anything else becomes the fallback. */
export function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** A small non-negative whole number from a route parameter, or null. Rejects "1e3", "0x10", " 5 ". */
export function smallInt(v: unknown, max = 100_000): number | null {
  if (typeof v !== 'string' || !/^\d{1,6}$/.test(v)) return null;
  const n = Number(v);
  return n <= max ? n : null;
}

/** An ISO timestamp from a route parameter, or null when it does not parse to a real date. */
export function isoDate(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 40 || !/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/.test(v)) return null;
  return Number.isNaN(Date.parse(v)) ? null : v;
}

/**
 * True when `url` is HTTPS and its host is one of `allowedHosts` or a subdomain of one.
 * Rejects credentials in the URL, non-default ports and anything that is not a plain https link.
 */
export function isAllowedUrl(url: unknown, allowedHosts: readonly string[]): url is string {
  if (typeof url !== 'string' || url.length > 2048) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return false;
  const host = u.hostname.toLowerCase();
  return allowedHosts.some((h) => host === h || host.endsWith(`.${h}`));
}
