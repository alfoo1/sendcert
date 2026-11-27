import { NextResponse } from 'next/server';
import { allowPublicHit, clientIpFrom, hitsSoFar, PUBLIC_LIMITS } from '@/lib/publicRateLimit';
import { isToken } from '@/lib/eventMode/tokens';
import { getByToken } from '@/lib/eventMode/store';

const { action: ACTION, unknownToken: UNKNOWN } = PUBLIC_LIMITS;

/**
 * Checks a request for a public token page or route: per-IP cap per action,
 * and an IP that already tried too many tokens that don't exist is blocked
 * for a while (brute-force guard). Returns 'ok', 'limited' or 'not_found'
 * together with the recipient and event when found.
 */
export async function lookupPublicToken(headers: Headers, token: string, action: string) {
  const ip = clientIpFrom(headers);
  if (!allowPublicHit(`${action}|${ip}`, ACTION.limit, ACTION.windowMs)) return { status: 'limited' as const };
  if (hitsSoFar(`unknown|${ip}`, UNKNOWN.windowMs) >= UNKNOWN.limit) return { status: 'limited' as const };
  const found = isToken(token) ? await getByToken(token) : null;
  if (!found) {
    allowPublicHit(`unknown|${ip}`, UNKNOWN.limit, UNKNOWN.windowMs);
    return { status: 'not_found' as const };
  }
  return { status: 'ok' as const, ...found };
}

/** Same check for API routes, mapped to JSON responses. */
export async function resolvePublicToken(req: Request, token: string, action: string) {
  const result = await lookupPublicToken(req.headers, token, action);
  if (result.status === 'limited') {
    return { response: NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 }) };
  }
  if (result.status === 'not_found') return { response: NextResponse.json({ error: 'Link not found.' }, { status: 404 }) };
  return { found: { event: result.event, recipient: result.recipient } };
}
