// Organizer page paths (safe for client components).
export function eventDashboardPath(locale: 'en' | 'es', id: string): string {
  return locale === 'es' ? `/es/eventos/${id}` : `/events/${id}`;
}
