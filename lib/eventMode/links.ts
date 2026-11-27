import { siteUrl } from '@/lib/siteUrl';

// Public URLs for event recipients, on the domain serving this request
// (production, a Vercel preview or localhost). Server-only.

export function personalLink(token: string): string {
  return `${siteUrl()}/e/${token}`;
}

export function unsubscribeLink(token: string): string {
  return `${siteUrl()}/e/${token}/unsubscribe`;
}

export { eventDashboardPath } from '@/lib/eventMode/paths';
