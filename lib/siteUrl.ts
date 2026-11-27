import { headers } from 'next/headers';

// Hosts that may receive a sign-in link from production, and whose own
// domain is used for links: this project's Vercel preview URLs and local
// development.
const PREVIEW_HOST = /^sendcert-[a-z0-9-]+-alfonso-2467s-projects\.vercel\.app$/;

export function isTrustedPreviewHost(host: string): boolean {
  return PREVIEW_HOST.test(host) || /^localhost:\d+$/.test(host);
}

/**
 * Public base URL for links built on the server. Production uses
 * NEXT_PUBLIC_SITE_URL (https://www.sendcert.org). On a Vercel preview or
 * localhost, the domain of the current request, so personal links and
 * sign-in made there come back there. Server-only (reads request headers).
 */
export function siteUrl(): string {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  try {
    const h = headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host && isTrustedPreviewHost(host)) return `${host.startsWith('localhost') ? 'http' : 'https'}://${host}`;
  } catch {
    // Outside a request (build, tests): fall through.
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sendcert.org').replace(/\/$/, '');
}
