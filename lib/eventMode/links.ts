// Public URLs for event recipients.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sendcert.org').replace(/\/$/, '');

export function personalLink(token: string): string {
  return `${SITE_URL}/e/${token}`;
}

export function unsubscribeLink(token: string): string {
  return `${SITE_URL}/e/${token}/unsubscribe`;
}

/** Organizer pages, in the event's or the reader's language. */
export function eventDashboardPath(locale: 'en' | 'es', id: string): string {
  return locale === 'es' ? `/es/eventos/${id}` : `/events/${id}`;
}
