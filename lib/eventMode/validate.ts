import { isLocale, type Locale } from '@/lib/i18n';
import { PRESET_TEMPLATES } from '@/lib/templates';
import { isValidEmail } from '@/lib/validation';
import { isValidTimeZone } from '@/lib/eventMode/format';
import { clampBox, clampCircle } from '@/lib/shareCard/geometry';
import type { EventInput, PartnerLogo, ShareCardSettings, TextZone } from '@/lib/eventMode/types';

// Validation of what the organizer sends for an event. Returns a clean
// EventInput or the first problem, in plain words for the form.

export class EventInputError extends Error {}

type Body = Record<string, unknown>;

function str(body: Body, key: string, max: number): string | null {
  const v = body[key];
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw new EventInputError(`${key} must be text`);
  const t = v.trim();
  if (t.length > max) throw new EventInputError(`${key} is too long (max ${max} characters)`);
  return t || null;
}

// Images: our Storage bucket, or a data URL (local development / fallback).
function imageUrl(v: unknown): string | null {
  if (typeof v !== 'string' || !v) return null;
  if (v.startsWith('data:image/') && v.length < 1_500_000) return v;
  try {
    const u = new URL(v);
    if (u.protocol === 'https:' && /supabase\.co$/.test(u.hostname) && u.pathname.includes('/event-assets/')) return v;
  } catch {
    // fall through
  }
  throw new EventInputError('Unsupported image URL');
}

function httpUrl(v: string | null): string | null {
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
    return u.toString();
  } catch {
    throw new EventInputError('The event link is not a valid web address');
  }
}

function shareCard(v: unknown): ShareCardSettings {
  if (!v || typeof v !== 'object') return { level: 0 };
  const s = v as Record<string, unknown>;
  const level = s.level === 2 ? 2 : s.level === 1 ? 1 : 0;
  if (level !== 2) return { level };
  const bg = s.background as Record<string, unknown> | undefined;
  const zones = s.zones as Record<string, Record<string, unknown>> | undefined;
  if (!bg || !zones?.photo || !zones?.text) throw new EventInputError('Your share card design is incomplete');
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  const text = zones.text;
  const zoneText: TextZone = {
    ...clampBox({ x: num(text.x), y: num(text.y), w: num(text.w), h: num(text.h) }),
    font: text.font === 'serif' ? 'serif' : 'sans',
    color: typeof text.color === 'string' && /^#[0-9a-f]{6}$/i.test(text.color) ? text.color : '#111827',
    align: text.align === 'left' || text.align === 'right' ? text.align : 'center',
  };
  return {
    level: 2,
    background: { url: imageUrl(bg.url) ?? '', w: Math.round(num(bg.w)), h: Math.round(num(bg.h)) },
    zones: {
      photo: clampCircle({ cx: num(zones.photo.cx), cy: num(zones.photo.cy), r: num(zones.photo.r) }),
      text: zoneText,
    },
  };
}

export function parseEventInput(body: Body, fallbackLocale: Locale): EventInput {
  const name = str(body, 'name', 150);
  if (!name) throw new EventInputError('Add the event name');
  const eventDate = str(body, 'eventDate', 10);
  if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) throw new EventInputError('Invalid date');
  const eventTime = str(body, 'eventTime', 5);
  if (eventTime && !/^\d{2}:\d{2}$/.test(eventTime)) throw new EventInputError('Invalid time');
  const timezone = str(body, 'timezone', 64) ?? 'UTC';
  if (!isValidTimeZone(timezone)) throw new EventInputError('Invalid time zone');
  const accent = str(body, 'accentColor', 7) ?? '#1e3a5f';
  if (!/^#[0-9a-f]{6}$/i.test(accent)) throw new EventInputError('Invalid color');
  const style = str(body, 'style', 20) ?? 'elegant';
  if (!PRESET_TEMPLATES.some((t) => t.id === style)) throw new EventInputError('Invalid style');
  const replyTo = str(body, 'replyTo', 254);
  if (replyTo && !isValidEmail(replyTo)) throw new EventInputError('The reply-to email is not valid');

  const partners = Array.isArray(body.partnerLogos) ? body.partnerLogos.slice(0, 6) : [];
  const partnerLogos: PartnerLogo[] = partners
    .map((p) => {
      const o = (p ?? {}) as Record<string, unknown>;
      const url = imageUrl(o.url);
      return url ? { url, ...(typeof o.name === 'string' && o.name.trim() ? { name: o.name.trim().slice(0, 80) } : {}) } : null;
    })
    .filter((p): p is PartnerLogo => p !== null);

  return {
    locale: isLocale(body.locale) ? body.locale : fallbackLocale,
    name,
    eventDate,
    eventTime,
    timezone,
    venue: str(body, 'venue', 150),
    address: str(body, 'address', 250),
    organizerName: str(body, 'organizerName', 120),
    logoUrl: imageUrl(body.logoUrl),
    accentColor: accent,
    hashtag: str(body, 'hashtag', 60),
    eventUrl: httpUrl(str(body, 'eventUrl', 300)),
    partnerLogos,
    style,
    replyTo,
    inviteSubject: str(body, 'inviteSubject', 200),
    inviteBody: str(body, 'inviteBody', 5000),
    shareCard: shareCard(body.shareCard),
  };
}

/** Cleans a recipient list: trims, drops invalid emails, dedupes. */
export function parseRecipients(v: unknown, max = 5000): { people: { name: string; email: string }[]; invalid: number } {
  const list = Array.isArray(v) ? v.slice(0, max) : [];
  const people: { name: string; email: string }[] = [];
  const seen = new Set<string>();
  let invalid = 0;
  for (const item of list) {
    const o = (item ?? {}) as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
    const email = typeof o.email === 'string' ? o.email.trim().slice(0, 254) : '';
    if (!name || !isValidEmail(email)) {
      invalid += 1;
      continue;
    }
    if (seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    people.push({ name, email });
  }
  return { people, invalid };
}
