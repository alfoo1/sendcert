// Server side of the abuse filter (lib/abuse.ts): records blocked sends,
// alerts the owner, and caps how much guests can send in total.

import { blockedMessage, checkMessageContent, type AbuseCode } from '@/lib/abuse';
import { logEvent } from '@/lib/events';
import { notifyOwner } from '@/lib/notify';
import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import type { Locale } from '@/lib/i18n';

// All guests together (any IP) in the last 24 hours. Guests are rare and a
// script can rotate IPs, so the per-IP monthly quota alone isn't a limit.
export const GUEST_DAILY_GLOBAL_LIMIT = Number(process.env.GUEST_DAILY_GLOBAL_LIMIT ?? 150);

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

const ALERT_EVERY_MS = 60 * 60_000;
const alertState: { last: number; suppressed: number } = ((globalThis as { __sendcertAbuseAlert?: { last: number; suppressed: number } }).__sendcertAbuseAlert ??= {
  last: 0,
  suppressed: 0,
});

type BlockInfo = {
  route: string;
  code: AbuseCode | 'guest_cap' | 'rate_limit';
  match: string;
  userId: string | null;
  ipHash: string;
  recipients?: number;
  subject?: string;
};

/** Logs a blocked send and emails the owner (at most once an hour per server instance). */
export async function reportBlocked(info: BlockInfo): Promise<void> {
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
        '\nDetails: /admin (Problems & sign-in).',
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
  const checks = [
    checkMessageContent(input.texts, { allowLinks: Boolean(input.userId) }),
    input.names?.length ? checkMessageContent(input.names, { allowLinks: false }) : ({ ok: true } as const),
  ];
  for (const check of checks) {
    if (check.ok) continue;
    await reportBlocked({
      route: input.route,
      code: check.code,
      match: check.match,
      userId: input.userId,
      ipHash: input.ipHash,
      recipients: input.recipients,
      subject: input.subject,
    });
    return blockedMessage(check, input.locale);
  }
  return null;
}
