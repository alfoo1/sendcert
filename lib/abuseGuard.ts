// Server side of the abuse filter (lib/abuse.ts): records blocked sends,
// alerts the owner, and caps how much guests can send in total.

import { blockedMessage, checkMessageContent, type AbuseCode, type LinkPolicy } from '@/lib/abuse';
import { logEvent } from '@/lib/events';
import { notifyOwner } from '@/lib/notify';
import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import type { Locale } from '@/lib/i18n';

// All guests together (any IP) in the last 24 hours, kept well under the
// email provider's 100/day so guests can never use up everyone's sending.
// Guests are rare (4 sends in the 30 days before this) and a
// script can rotate IPs, so the per-IP monthly quota alone isn't a limit.
export const GUEST_DAILY_GLOBAL_LIMIT = Number(process.env.GUEST_DAILY_GLOBAL_LIMIT ?? 50);

/** Kill switch: GUEST_SENDING=off in the environment pauses sending without an account. */
export function guestSendingPaused(): boolean {
  return (process.env.GUEST_SENDING ?? '').trim().toLowerCase() === 'off';
}

export function guestPausedMessage(locale: Locale): string {
  return locale === 'es'
    ? 'El envío sin cuenta está pausado por ahora. Crea una cuenta gratis (solo tu correo) para enviar.'
    : 'Sending without an account is paused for now. Create a free account (just your email) to send.';
}

/** Emails guests sent in the last 24 hours, across every IP. */
export async function guestEmailsLast24h(): Promise<number> {
  if (!isSupabaseServiceConfigured()) return 0;
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data, error } = await createServiceSupabaseClient()
    .from('send_log')
    .select('sent')
    .is('user_id', null)
    .gte('created_at', since)
    .limit(10000);
  if (error) {
    console.error('guestEmailsLast24h failed:', error.message);
    return 0;
  }
  return (data ?? []).reduce((sum, row) => sum + ((row.sent as number) ?? 0), 0);
}

export function guestCapMessage(locale: Locale): string {
  return locale === 'es'
    ? 'Se alcanzó el límite diario de envíos sin cuenta. Crea una cuenta gratis (solo tu correo) para enviar ahora.'
    : "Today's limit for sending without an account has been reached. Create a free account (just your email) to send now.";
}

// Accounts younger than this can only link to well-known sites
// (lib/abuse.ts): a throwaway account was the next thing the 2026-11-27
// attacker tried once guests couldn't send links.
export const NEW_ACCOUNT_DAYS = Number(process.env.NEW_ACCOUNT_DAYS ?? 7);

type AccountStatus = { links: LinkPolicy; banned: boolean };
const ACCOUNT_CACHE_MS = 5 * 60_000;
const accountCache: Map<string, { at: number; status: AccountStatus }> = ((
  globalThis as { __sendcertAccountStatus?: Map<string, { at: number; status: AccountStatus }> }
).__sendcertAccountStatus ??= new Map());

/** Link policy for a sender, and whether the account was banned in Supabase. */
export async function accountStatus(userId: string | null): Promise<AccountStatus> {
  if (!userId) return { links: 'none', banned: false };
  const cached = accountCache.get(userId);
  if (cached && Date.now() - cached.at < ACCOUNT_CACHE_MS) return cached.status;
  // If we can't tell how old the account is, treat it as new.
  let status: AccountStatus = { links: 'trusted', banned: false };
  if (isSupabaseServiceConfigured()) {
    try {
      const { data, error } = await createServiceSupabaseClient().auth.admin.getUserById(userId);
      if (error) throw error;
      const user = data.user as { created_at?: string; banned_until?: string | null } | null;
      const age = user?.created_at ? Date.now() - Date.parse(user.created_at) : 0;
      status = {
        links: age >= NEW_ACCOUNT_DAYS * 86_400_000 ? 'any' : 'trusted',
        banned: Boolean(user?.banned_until && Date.parse(user.banned_until) > Date.now()),
      };
    } catch (err) {
      console.error('accountStatus lookup failed:', err);
    }
  }
  accountCache.set(userId, { at: Date.now(), status });
  return status;
}

function bannedMessage(locale: Locale): string {
  return locale === 'es'
    ? 'Esta cuenta está suspendida. Si crees que es un error, escríbenos desde la página de contacto.'
    : 'This account is suspended. If you think this is a mistake, contact us.';
}

// What a blocked send said, kept 30 days (table blocked_sends, migration
// 0011) so the owner can see it in /admin. Recipient emails are not kept.
const BLOCKED_TEXT_MAX = 8000;
const BLOCKED_NAMES_MAX = 20;
export const BLOCKED_SENDS_DAYS = 30;

async function saveBlockedSend(info: BlockInfo): Promise<void> {
  if (!info.content || !isSupabaseServiceConfigured()) return;
  const text = info.content.texts
    .filter((t): t is string => typeof t === 'string' && t.trim() !== '')
    .join('\n\n---\n\n')
    .slice(0, BLOCKED_TEXT_MAX);
  const names = (info.content.names ?? []).slice(0, BLOCKED_NAMES_MAX).map((n) => String(n).slice(0, 120));
  try {
    const { error } = await createServiceSupabaseClient()
      .from('blocked_sends')
      .insert({
        user_id: info.userId,
        route: info.route,
        code: info.code,
        match: info.match.slice(0, 300),
        ip_hash: info.ipHash.slice(0, 12),
        recipients: info.recipients ?? null,
        subject: info.subject?.slice(0, 300) ?? null,
        content: text || null,
        names: names.length ? names : null,
      });
    if (error) console.error('blocked_sends insert failed:', error.message);
  } catch (err) {
    console.error('blocked_sends insert threw:', err);
  }
}

/** Deletes stored blocked sends older than 30 days (called by the daily cron). */
export async function deleteOldBlockedSends(): Promise<void> {
  if (!isSupabaseServiceConfigured()) return;
  const cutoff = new Date(Date.now() - BLOCKED_SENDS_DAYS * 86_400_000).toISOString();
  const { error } = await createServiceSupabaseClient().from('blocked_sends').delete().lt('created_at', cutoff);
  if (error) console.error('Failed to delete old blocked_sends:', error.message);
}

export type BlockedSendRow = {
  created_at: string;
  user_id: string | null;
  route: string;
  code: string;
  match: string | null;
  ip_hash: string | null;
  recipients: number | null;
  subject: string | null;
  content: string | null;
  names: string[] | null;
};

/** Blocked sends of the last 30 days, newest first (for /admin). Empty if the table doesn't exist yet. */
export async function recentBlockedSends(limit = 100): Promise<BlockedSendRow[]> {
  if (!isSupabaseServiceConfigured()) return [];
  const { data, error } = await createServiceSupabaseClient()
    .from('blocked_sends')
    .select('created_at, user_id, route, code, match, ip_hash, recipients, subject, content, names')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as BlockedSendRow[];
}

const ALERT_EVERY_MS = 60 * 60_000;
const alertState: { last: number; suppressed: number } = ((globalThis as { __sendcertAbuseAlert?: { last: number; suppressed: number } }).__sendcertAbuseAlert ??= {
  last: 0,
  suppressed: 0,
});

type BlockInfo = {
  route: string;
  code: AbuseCode | 'guest_cap' | 'rate_limit' | 'banned';
  match: string;
  userId: string | null;
  ipHash: string;
  recipients?: number;
  subject?: string;
  // Full text of the attempt, stored in blocked_sends for /admin.
  content?: { texts: (string | null | undefined)[]; names?: string[] };
};

/** Logs a blocked send and emails the owner (at most once an hour per server instance). */
export async function reportBlocked(info: BlockInfo): Promise<void> {
  await saveBlockedSend(info);
  await logEvent('abuse.blocked', {
    level: 'warn',
    message: `${info.code}: ${info.match}`.slice(0, 300),
    path: info.route,
    detail: {
      code: info.code,
      tier: info.userId ? 'user' : 'guest',
      ip: info.ipHash.slice(0, 12),
      recipients: info.recipients ?? null,
      subject: info.subject?.slice(0, 120) ?? null,
    },
    userId: info.userId,
  });

  const now = Date.now();
  if (now - alertState.last < ALERT_EVERY_MS) {
    alertState.suppressed += 1;
    return;
  }
  const suppressed = alertState.suppressed;
  alertState.last = now;
  alertState.suppressed = 0;
  try {
    await notifyOwner(
      `[SendCert] Blocked a suspicious send (${info.code})`,
      [
        `Route: ${info.route}`,
        `Sender: ${info.userId ? `account ${info.userId}` : `guest, ip ${info.ipHash.slice(0, 12)}`}`,
        `Rule: ${info.code} (${info.match})`,
        info.recipients != null ? `Recipients: ${info.recipients}` : '',
        info.subject ? `Subject: ${info.subject.slice(0, 120)}` : '',
        suppressed ? `\n${suppressed} more blocks in the last hour were not emailed.` : '',
        info.content ? '\nFull text: /admin (Blocked sends).' : '\nDetails: /admin (Problems & sign-in).',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  } catch (err) {
    console.error('Abuse alert email failed:', err);
  }
}

/**
 * Runs the content check for one send. Returns the error to show (and logs
 * it), or null when the send can go ahead.
 */
export async function screenSend(input: {
  route: string;
  userId: string | null;
  ipHash: string;
  locale: Locale;
  // Free text written by the sender (subject, body, certificate name...).
  texts: (string | null | undefined)[];
  // Recipient names: they end up in the email through {{name}}, so they
  // never get links, not even for accounts.
  names?: string[];
  recipients?: number;
  subject?: string;
}): Promise<string | null> {
  const account = await accountStatus(input.userId);
  const report = (code: BlockInfo['code'], match: string) =>
    reportBlocked({
      route: input.route,
      code,
      match,
      userId: input.userId,
      ipHash: input.ipHash,
      recipients: input.recipients,
      subject: input.subject,
      content: { texts: input.texts, names: input.names },
    });
  if (account.banned) {
    await report('banned', 'account banned');
    return bannedMessage(input.locale);
  }
  const checks = [
    checkMessageContent(input.texts, { links: account.links }),
    input.names?.length ? checkMessageContent(input.names, { links: 'none' }) : ({ ok: true } as const),
  ];
  for (const check of checks) {
    if (check.ok) continue;
    await report(check.code, check.match);
    return blockedMessage(check, input.locale);
  }
  return null;
}
