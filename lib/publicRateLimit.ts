// Rate limit for public, token-based routes (/e/<token> answers, survey,
// unsubscribe) so personal links can't be brute-forced. Tokens already have
// 128 random bits; this adds a per-IP cap. In memory per server instance:
// best effort on serverless, which is enough on top of the token entropy.

type Window = { start: number; hits: number };
const windows: Map<string, Window> = ((globalThis as { __sendcertPublicRl?: Map<string, Window> }).__sendcertPublicRl ??=
  new Map());

/**
 * True when `key` (e.g. "rsvp|<ip>") is still under `limit` hits per
 * `windowMs`. Counts the hit.
 */
export function allowPublicHit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now - w.start > windowMs) {
    windows.set(key, { start: now, hits: 1 });
    if (windows.size > 20_000) windows.clear();
    return true;
  }
  w.hits += 1;
  return w.hits <= limit;
}

/** Hits counted for `key` in its current window, without counting a new one. */
export function hitsSoFar(key: string, windowMs: number): number {
  const w = windows.get(key);
  if (!w || Date.now() - w.start > windowMs) return 0;
  return w.hits;
}

// Requests per IP per minute for each public action, and a stricter cap on
// lookups of tokens that don't exist (the brute-force signature).
export const PUBLIC_LIMITS = {
  action: { limit: 60, windowMs: 60_000 },
  unknownToken: { limit: 10, windowMs: 10 * 60_000 },
} as const;

export function clientIpFrom(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip')?.trim() || 'unknown';
}
