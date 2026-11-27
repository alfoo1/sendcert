import { randomUUID } from 'node:crypto';
import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import { isLocale } from '@/lib/i18n';
import { generateUniqueTokens } from '@/lib/eventMode/tokens';
import type { Rsvp } from '@/lib/eventMode/logic';
import type { EventInput, EventRecipient, EventRecord, ShareCardSettings } from '@/lib/eventMode/types';

// Persistence for events (tables from migration 0010), always through the
// service role on the server. Callers check ownership (owner id) or the
// recipient token before calling in. Local development without Supabase
// uses an in-memory copy so the whole flow can be tried with `next dev`.

type Row = Record<string, unknown>;

const useMemory = () => !isSupabaseServiceConfigured() && process.env.NODE_ENV !== 'production';

type Memory = {
  events: Map<string, EventRecord>;
  recipients: Map<string, EventRecipient & { unsubscribedAt: string | null }>;
  unsubscribes: Set<string>; // `${ownerId}|${email}`
};
const memory: Memory = ((globalThis as { __sendcertEvents?: Memory }).__sendcertEvents ??= {
  events: new Map(),
  recipients: new Map(),
  unsubscribes: new Set(),
});

export class EventStoreError extends Error {}

function db() {
  if (!isSupabaseServiceConfigured()) throw new EventStoreError('Event storage is not configured');
  return createServiceSupabaseClient();
}

/** 12 months after the event (or after today when the date is unknown). */
function deleteAfter(eventDate: string | null): string {
  const base = eventDate ? new Date(`${eventDate}T00:00:00Z`) : new Date();
  base.setUTCFullYear(base.getUTCFullYear() + 1);
  return base.toISOString().slice(0, 10);
}

function toEvent(row: Row): EventRecord {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    createdAt: row.created_at as string,
    locale: isLocale(row.locale) ? row.locale : 'en',
    name: row.name as string,
    eventDate: (row.event_date as string | null) ?? null,
    eventTime: (row.event_time as string | null) ?? null,
    timezone: (row.timezone as string) ?? 'UTC',
    venue: (row.venue as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    organizerName: (row.organizer_name as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    accentColor: (row.accent_color as string) ?? '#1e3a5f',
    hashtag: (row.hashtag as string | null) ?? null,
    eventUrl: (row.event_url as string | null) ?? null,
    partnerLogos: (row.partner_logos as EventRecord['partnerLogos']) ?? [],
    style: (row.style as string) ?? 'elegant',
    replyTo: (row.reply_to as string | null) ?? null,
    inviteSubject: (row.invite_subject as string | null) ?? null,
    inviteBody: (row.invite_body as string | null) ?? null,
    shareCard: (row.share_card as ShareCardSettings) ?? {},
  };
}

function fromInput(input: EventInput): Row {
  return {
    locale: input.locale,
    name: input.name,
    event_date: input.eventDate,
    event_time: input.eventTime,
    timezone: input.timezone,
    venue: input.venue,
    address: input.address,
    organizer_name: input.organizerName,
    logo_url: input.logoUrl,
    accent_color: input.accentColor,
    hashtag: input.hashtag,
    event_url: input.eventUrl,
    partner_logos: input.partnerLogos,
    style: input.style,
    reply_to: input.replyTo,
    invite_subject: input.inviteSubject,
    invite_body: input.inviteBody,
    share_card: input.shareCard,
    delete_after: deleteAfter(input.eventDate),
  };
}

function toRecipient(row: Row, unsubscribed: boolean): EventRecipient {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    token: row.token as string,
    name: row.name as string,
    email: row.email as string,
    createdAt: row.created_at as string,
    rsvp: row.rsvp as Rsvp,
    rsvpReason: (row.rsvp_reason as string | null) ?? null,
    respondedAt: (row.responded_at as string | null) ?? null,
    invitedAt: (row.invited_at as string | null) ?? null,
    unsubscribed: unsubscribed || Boolean(row.unsubscribed_at),
    attended: (row.attended as boolean | null) ?? null,
    verifyId: (row.verify_id as string | null) ?? null,
  };
}

// ---------- Events ----------

export async function createEvent(ownerId: string, input: EventInput): Promise<EventRecord> {
  if (useMemory()) {
    const event: EventRecord = { ...input, id: randomUUID(), ownerId, createdAt: new Date().toISOString() };
    memory.events.set(event.id, event);
    return event;
  }
  const { data, error } = await db()
    .from('events')
    .insert({ owner_id: ownerId, ...fromInput(input) })
    .select('*')
    .single();
  if (error) throw new EventStoreError(error.message);
  return toEvent(data);
}

export async function updateEvent(ownerId: string, id: string, input: EventInput): Promise<EventRecord | null> {
  if (useMemory()) {
    const current = memory.events.get(id);
    if (!current || current.ownerId !== ownerId) return null;
    const event = { ...current, ...input };
    memory.events.set(id, event);
    return event;
  }
  const { data, error } = await db()
    .from('events')
    .update({ ...fromInput(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('*')
    .maybeSingle();
  if (error) throw new EventStoreError(error.message);
  return data ? toEvent(data) : null;
}

export async function getEvent(ownerId: string, id: string): Promise<EventRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (useMemory()) {
    const event = memory.events.get(id);
    return event && event.ownerId === ownerId ? event : null;
  }
  const { data } = await db().from('events').select('*').eq('id', id).eq('owner_id', ownerId).maybeSingle();
  return data ? toEvent(data) : null;
}

export async function listEvents(ownerId: string): Promise<EventRecord[]> {
  if (useMemory()) {
    return Array.from(memory.events.values())
      .filter((e) => e.ownerId === ownerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const { data } = await db()
    .from('events')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(200);
  return (data ?? []).map(toEvent);
}

export type EventSummary = EventRecord & { counts: { total: number; coming: number; notComing: number; noAnswer: number } };

/** The organizer's events with answer counts (dashboard list). */
export async function listEventsWithCounts(ownerId: string): Promise<EventSummary[]> {
  const events = await listEvents(ownerId);
  const counts = new Map(events.map((e) => [e.id, { total: 0, coming: 0, notComing: 0, noAnswer: 0 }]));
  let rows: { event_id: string; rsvp: string }[] = [];
  if (useMemory()) {
    rows = Array.from(memory.recipients.values()).map((r) => ({ event_id: r.eventId, rsvp: r.rsvp }));
  } else if (events.length > 0) {
    const { data } = await db()
      .from('event_recipients')
      .select('event_id, rsvp')
      .in('event_id', events.map((e) => e.id))
      .limit(50000);
    rows = (data ?? []) as { event_id: string; rsvp: string }[];
  }
  for (const r of rows) {
    const c = counts.get(r.event_id);
    if (!c) continue;
    c.total += 1;
    if (r.rsvp === 'yes') c.coming += 1;
    else if (r.rsvp === 'no') c.notComing += 1;
    else c.noAnswer += 1;
  }
  return events.map((e) => ({ ...e, counts: counts.get(e.id)! }));
}

/** Deletes events past their retention date (daily cron). */
export async function deleteExpiredEvents(): Promise<void> {
  if (!isSupabaseServiceConfigured()) return;
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await db().from('events').delete().lt('delete_after', today);
  if (error) console.error('Failed to delete expired events:', error.message);
}

// ---------- Recipients ----------

async function unsubscribedEmails(ownerId: string): Promise<Set<string>> {
  if (useMemory()) {
    return new Set(
      Array.from(memory.unsubscribes)
        .filter((k) => k.startsWith(`${ownerId}|`))
        .map((k) => k.slice(ownerId.length + 1)),
    );
  }
  const { data } = await db().from('email_unsubscribes').select('email_lower').eq('owner_id', ownerId).limit(10000);
  return new Set((data ?? []).map((r) => r.email_lower as string));
}

export async function listRecipients(event: Pick<EventRecord, 'id' | 'ownerId'>): Promise<EventRecipient[]> {
  const unsubscribed = await unsubscribedEmails(event.ownerId);
  if (useMemory()) {
    return Array.from(memory.recipients.values())
      .filter((r) => r.eventId === event.id)
      .map((r) => ({ ...r, unsubscribed: r.unsubscribed || unsubscribed.has(r.email.toLowerCase()) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  const { data } = await db()
    .from('event_recipients')
    .select('*')
    .eq('event_id', event.id)
    .order('name', { ascending: true })
    .limit(10000);
  return (data ?? []).map((row) => toRecipient(row, unsubscribed.has((row.email as string).toLowerCase())));
}

/**
 * Adds people to an event, skipping emails already on it. Returns how many
 * were added and which were skipped as duplicates.
 */
export async function addRecipients(
  event: Pick<EventRecord, 'id' | 'ownerId'>,
  people: { name: string; email: string }[],
): Promise<{ added: number; duplicates: string[] }> {
  const existing = await listRecipients(event);
  const seen = new Set(existing.map((r) => r.email.toLowerCase()));
  const duplicates: string[] = [];
  const fresh: { name: string; email: string }[] = [];
  for (const p of people) {
    const key = p.email.toLowerCase();
    if (seen.has(key)) duplicates.push(p.email);
    else {
      seen.add(key);
      fresh.push(p);
    }
  }
  if (fresh.length === 0) return { added: 0, duplicates };
  const tokens = generateUniqueTokens(fresh.length, new Set(existing.map((r) => r.token)));
  const now = new Date().toISOString();

  if (useMemory()) {
    fresh.forEach((p, i) => {
      const id = randomUUID();
      memory.recipients.set(id, {
        id,
        eventId: event.id,
        token: tokens[i],
        name: p.name,
        email: p.email,
        createdAt: now,
        rsvp: 'pending',
        rsvpReason: null,
        respondedAt: null,
        invitedAt: null,
        unsubscribed: false,
        unsubscribedAt: null,
        attended: null,
        verifyId: null,
      });
    });
    return { added: fresh.length, duplicates };
  }

  const rows = fresh.map((p, i) => ({ event_id: event.id, token: tokens[i], name: p.name, email: p.email }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db().from('event_recipients').insert(rows.slice(i, i + 500));
    if (error) throw new EventStoreError(error.message);
  }
  return { added: fresh.length, duplicates };
}

/** Recipient and their event from a personal link token. */
export async function getByToken(token: string): Promise<{ event: EventRecord; recipient: EventRecipient } | null> {
  if (useMemory()) {
    const recipient = Array.from(memory.recipients.values()).find((r) => r.token === token);
    if (!recipient) return null;
    const event = memory.events.get(recipient.eventId);
    if (!event) return null;
    const unsubscribed = await unsubscribedEmails(event.ownerId);
    return { event, recipient: { ...recipient, unsubscribed: recipient.unsubscribed || unsubscribed.has(recipient.email.toLowerCase()) } };
  }
  const { data } = await db().from('event_recipients').select('*, events(*)').eq('token', token).maybeSingle();
  if (!data || !data.events) return null;
  const event = toEvent(data.events as Row);
  const { data: unsub } = await db()
    .from('email_unsubscribes')
    .select('id')
    .eq('owner_id', event.ownerId)
    .eq('email_lower', (data.email as string).toLowerCase())
    .maybeSingle();
  return { event, recipient: toRecipient(data, Boolean(unsub)) };
}

export async function setRsvp(recipientId: string, rsvp: 'yes' | 'no', reason: string | null): Promise<void> {
  const patch = { rsvp, rsvpReason: rsvp === 'no' ? reason : null, respondedAt: new Date().toISOString() };
  if (useMemory()) {
    const r = memory.recipients.get(recipientId);
    if (r) memory.recipients.set(recipientId, { ...r, ...patch });
    return;
  }
  const { error } = await db()
    .from('event_recipients')
    .update({ rsvp: patch.rsvp, rsvp_reason: patch.rsvpReason, responded_at: patch.respondedAt })
    .eq('id', recipientId);
  if (error) throw new EventStoreError(error.message);
}

/** Stops every future email from this organizer to this address. */
export async function unsubscribeRecipient(event: EventRecord, recipient: EventRecipient): Promise<void> {
  const email = recipient.email.toLowerCase();
  const now = new Date().toISOString();
  if (useMemory()) {
    memory.unsubscribes.add(`${event.ownerId}|${email}`);
    const r = memory.recipients.get(recipient.id);
    if (r) memory.recipients.set(recipient.id, { ...r, unsubscribed: true, unsubscribedAt: now });
    return;
  }
  const { error } = await db()
    .from('email_unsubscribes')
    .upsert({ owner_id: event.ownerId, email_lower: email, event_id: event.id }, { onConflict: 'owner_id,email_lower', ignoreDuplicates: true });
  if (error) throw new EventStoreError(error.message);
  await db().from('event_recipients').update({ unsubscribed_at: now }).eq('id', recipient.id);
}

export async function markInvited(recipientIds: string[]): Promise<void> {
  if (recipientIds.length === 0) return;
  const now = new Date().toISOString();
  if (useMemory()) {
    for (const id of recipientIds) {
      const r = memory.recipients.get(id);
      if (r) memory.recipients.set(id, { ...r, invitedAt: now });
    }
    return;
  }
  for (let i = 0; i < recipientIds.length; i += 200) {
    await db().from('event_recipients').update({ invited_at: now }).in('id', recipientIds.slice(i, i + 200));
  }
}
