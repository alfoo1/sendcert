import type { NextRequest } from 'next/server';

// In-memory counter keyed by "ip|YYYY-MM". Simple and good enough for the MVP.
// Trade-off: resets on server restart and is per-process, which we accept.
// A horizontally scaled deployment would need Redis or similar.
const counters = new Map<string, number>();

const DEFAULT_LIMIT = Number(process.env.RATE_LIMIT_PER_MONTH ?? 150);

/**
 * Extracts the client IP from the request.
 * Falls back through the chain: x-forwarded-for (first hop) → x-real-ip → unknown.
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

/**
 * Returns the bucket key for the current month (UTC).
 */
function currentBucket(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export type RateLimitStatus = {
  ip: string;
  used: number;
  limit: number;
  remaining: number;
};

/**
 * Returns current usage without mutating the counter.
 */
export function peekRateLimit(ip: string, limit: number = DEFAULT_LIMIT): RateLimitStatus {
  const key = `${ip}|${currentBucket()}`;
  const used = counters.get(key) ?? 0;
  return { ip, used, limit, remaining: Math.max(0, limit - used) };
}

/**
 * Atomically attempts to consume `amount` units for this IP within the monthly bucket.
 * Returns { allowed: true, status } if the increment was applied,
 * or { allowed: false, status } if it would exceed the limit (counter unchanged).
 */
export function tryConsume(
  ip: string,
  amount: number,
  limit: number = DEFAULT_LIMIT,
): { allowed: boolean; status: RateLimitStatus } {
  const key = `${ip}|${currentBucket()}`;
  const used = counters.get(key) ?? 0;
  if (used + amount > limit) {
    return {
      allowed: false,
      status: { ip, used, limit, remaining: Math.max(0, limit - used) },
    };
  }
  counters.set(key, used + amount);
  return {
    allowed: true,
    status: { ip, used: used + amount, limit, remaining: limit - used - amount },
  };
}
