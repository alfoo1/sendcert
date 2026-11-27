// Browser helper to report problems to /api/events (stored in app_events).
// Fire-and-forget: reporting must never affect what the user is doing.
// Never pass names, emails or other personal data in message or detail.

export type ClientEventKind =
  | 'client.error'
  | 'client.request_failed'
  | 'auth.link_requested'
  | 'auth.link_request_failed';

const MAX_REPORTS_PER_PAGE = 10;
let sent = 0;
const seen = new Set<string>();

export function reportEvent(kind: ClientEventKind, message?: string, detail?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const key = `${kind}|${message ?? ''}`;
  if (seen.has(key) || sent >= MAX_REPORTS_PER_PAGE) return;
  seen.add(key);
  sent += 1;
  const payload = JSON.stringify({
    kind,
    message: message?.slice(0, 1000),
    path: window.location.pathname,
    detail,
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }));
      return;
    }
  } catch {
    // fall through to fetch
  }
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

/** Reports a failed request the user saw (status and the API's error text). */
export function reportRequestFailure(endpoint: string, status: number | null, message: string): void {
  reportEvent('client.request_failed', message, { endpoint, status });
}
