import { LOCALE_TAG, type Locale } from '@/lib/i18n';
import type { EventRecord } from '@/lib/eventMode/types';

// Display helpers for events. Pure (no Node APIs): used on the server, in
// client components and in tests.

type EventWhen = Pick<EventRecord, 'eventDate' | 'eventTime' | 'timezone'>;

function tzOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return (asUtc - at.getTime()) / 60_000;
}

/** The UTC instant of a wall-clock date and time in an IANA time zone. */
export function zonedTimeToUtc(date: string, time: string | null, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = tzOffsetMinutes(new Date(guess), timeZone);
  let utc = guess - first * 60_000;
  const second = tzOffsetMinutes(new Date(utc), timeZone);
  if (second !== first) utc = guess - second * 60_000;
  return new Date(utc);
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "Friday, December 11, 2026" in the reader's language (no time zone shift). */
export function formatEventDate(e: EventWhen, locale: Locale, style: 'long' | 'short' = 'long'): string | null {
  if (!e.eventDate) return null;
  return new Date(`${e.eventDate}T12:00:00Z`).toLocaleDateString(LOCALE_TAG[locale], {
    weekday: style === 'long' ? 'long' : undefined,
    year: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** "9:00 AM EST" / "9:00 a. m. GMT-5": the time where the event happens. */
export function formatEventTime(e: EventWhen, locale: Locale): string | null {
  if (!e.eventTime || !e.eventDate) return null;
  const at = zonedTimeToUtc(e.eventDate, e.eventTime, e.timezone);
  return at.toLocaleTimeString(LOCALE_TAG[locale], {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: e.timezone,
    timeZoneName: 'short',
  });
}

/** Google Calendar "add event" link (2 hours long when only a start is known). */
export function googleCalendarUrl(e: EventRecord, personalUrl?: string): string | null {
  if (!e.eventDate) return null;
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  let dates: string;
  if (e.eventTime) {
    const start = zonedTimeToUtc(e.eventDate, e.eventTime, e.timezone);
    const end = new Date(start.getTime() + 2 * 60 * 60_000);
    dates = `${fmt(start)}/${fmt(end)}`;
  } else {
    const day = e.eventDate.replace(/-/g, '');
    const next = new Date(`${e.eventDate}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    dates = `${day}/${next.toISOString().slice(0, 10).replace(/-/g, '')}`;
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.name,
    dates,
    details: [e.eventUrl, personalUrl].filter(Boolean).join('\n'),
    location: [e.venue, e.address].filter(Boolean).join(', '),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** A plain .ics file for Apple/Outlook calendars. */
export function icsFile(e: EventRecord, uid: string, personalUrl?: string): string | null {
  if (!e.eventDate) return null;
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SendCert//Events//EN', 'BEGIN:VEVENT', `UID:${uid}@sendcert.org`, `DTSTAMP:${fmt(new Date())}`];
  if (e.eventTime) {
    const start = zonedTimeToUtc(e.eventDate, e.eventTime, e.timezone);
    lines.push(`DTSTART:${fmt(start)}`, `DTEND:${fmt(new Date(start.getTime() + 2 * 60 * 60_000))}`);
  } else {
    const next = new Date(`${e.eventDate}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${e.eventDate.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`);
  }
  lines.push(`SUMMARY:${esc(e.name)}`);
  const where = [e.venue, e.address].filter(Boolean).join(', ');
  if (where) lines.push(`LOCATION:${esc(where)}`);
  const details = [e.eventUrl, personalUrl].filter(Boolean).join('\n');
  if (details) lines.push(`DESCRIPTION:${esc(details)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function hashtagText(tag: string | null): string | null {
  if (!tag) return null;
  const clean = tag.trim().replace(/^#+/, '').replace(/\s+/g, '');
  return clean ? `#${clean}` : null;
}

/** Prefilled LinkedIn post for the share card ("I'm attending" / "I attended"). */
export function defaultPostText(e: EventRecord, locale: Locale, phase: 'before' | 'after'): string {
  const date = formatEventDate(e, locale, 'short');
  const where = e.venue ? (locale === 'es' ? ` en ${e.venue}` : ` at ${e.venue}`) : '';
  const by = e.organizerName ? (locale === 'es' ? ` Organiza ${e.organizerName}.` : ` Hosted by ${e.organizerName}.`) : '';
  const tag = hashtagText(e.hashtag);
  const first =
    phase === 'before'
      ? locale === 'es'
        ? `¡Voy a ${e.name}${date ? ` el ${date}` : ''}${where}!`
        : `I'll be at ${e.name}${date ? ` on ${date}` : ''}${where}!`
      : locale === 'es'
        ? `Asistí a ${e.name}${where}. ¡Gracias por una gran jornada!`
        : `I attended ${e.name}${where}. Thanks for a great event!`;
  return [`${first}${by}`, e.eventUrl, tag].filter(Boolean).join('\n\n');
}

/** LinkedIn's share composer with the post text filled in (no image: LinkedIn doesn't allow it). */
export function linkedInComposeUrl(text: string): string {
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
}
