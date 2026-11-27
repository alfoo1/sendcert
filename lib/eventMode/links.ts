import { siteUrl } from '@/lib/siteUrl';

// Public URLs for event recipients (on previews, the preview's own domain).

export function personalLink(token: string): string {
  return `${siteUrl()}/e/${token}`;
}

export function unsubscribeLink(token: string): string {
  return `${siteUrl()}/e/${token}/unsubscribe`;
}

/** Organizer pages, in the event's or the reader's language. */
export function eventDashboardPath(locale: 'en' | 'es', id: string): string {
  return locale === 'es' ? `/es/eventos/${id}` : `/events/${id}`;
}
