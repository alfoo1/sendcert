import { NextResponse, type NextRequest } from 'next/server';
import { logEvent, type EventLevel } from '@/lib/events';
import { getClientIp } from '@/lib/rateLimit';
import { getLoggedInUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Browser-side reports (lib/clientEvents.ts): JavaScript errors, failed
// requests the user saw, and sign-in steps that only happen in the browser.
// Only these kinds are accepted, with their fixed level.
const ALLOWED: Record<string, EventLevel> = {
  'client.error': 'error',
  'client.request_failed': 'error',
  'auth.link_requested': 'info',
  'auth.link_request_failed': 'error',
};

// Best-effort flood guard per server instance: 30 reports per IP per minute.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, { start: number; n: number }>();

function allow(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(ip, { start: now, n: 1 });
    if (hits.size > 5000) hits.clear();
    return true;
  }
  entry.n += 1;
  return entry.n <= MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  if (!allow(getClientIp(req))) return new NextResponse(null, { status: 429 });
  let body: { kind?: unknown; message?: unknown; path?: unknown; detail?: unknown };
  try {
    const text = await req.text();
    if (text.length > 8000) return new NextResponse(null, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const kind = typeof body.kind === 'string' ? body.kind : '';
  const level = ALLOWED[kind];
  if (!level) return new NextResponse(null, { status: 400 });

  const detail =
    body.detail && typeof body.detail === 'object' && !Array.isArray(body.detail)
      ? (body.detail as Record<string, unknown>)
      : {};
  await logEvent(kind, {
    level,
    message: typeof body.message === 'string' ? body.message : undefined,
    path: typeof body.path === 'string' ? body.path : undefined,
    detail: { ...detail, userAgent: req.headers.get('user-agent')?.slice(0, 200) },
    userId: await getLoggedInUserId(),
  });
  return new NextResponse(null, { status: 204 });
}
