import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '@/lib/supabase';

// Server-side event log (table app_events, migration 0008). Records what goes
// wrong for users, plus the sign-in funnel, so problems show up in /admin and
// in the owner's daily email. Never store names, emails or IP addresses here.

export type EventLevel = 'error' | 'warn' | 'info';

export type EventInput = {
  level?: EventLevel;
  message?: string;
  path?: string;
  detail?: Record<string, unknown>;
  userId?: string | null;
};

const MAX_MESSAGE = 1000;
const MAX_DETAIL_CHARS = 4000;

// Mail servers put recipient addresses in their error messages; never store them.
const EMAIL_RE = /[^\s"'<>()]+@[^\s"'<>()]+\.[a-z]{2,}/gi;

export function scrubEmails(text: string): string {
  return text.replace(EMAIL_RE, '<email>');
}

function trimDetail(detail: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!detail) return null;
  const json = scrubEmails(JSON.stringify(detail));
  if (json.length <= MAX_DETAIL_CHARS) return JSON.parse(json);
  return { truncated: json.slice(0, MAX_DETAIL_CHARS) };
}

/** Records an event. Never throws: logging must not break the request. */
export async function logEvent(kind: string, input: EventInput = {}): Promise<void> {
  const level = input.level ?? 'error';
  const message = input.message ? scrubEmails(input.message).slice(0, MAX_MESSAGE) : null;
  if (level !== 'info') console.error(`[event] ${kind}: ${message ?? ''}`, input.detail ?? '');
  if (!isSupabaseServiceConfigured()) return;
  try {
    const { error } = await createServiceSupabaseClient()
      .from('app_events')
      .insert({
        level,
        kind: kind.slice(0, 80),
        message,
        path: input.path?.slice(0, 300) ?? null,
        detail: trimDetail(input.detail),
        user_id: input.userId ?? null,
      });
    if (error) console.error('app_events insert failed:', error.message);
  } catch (err) {
    console.error('app_events insert threw:', err);
  }
}

/** Message of an unknown thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return typeof err === 'string' ? err : JSON.stringify(err);
}

export type EventRow = {
  created_at: string;
  level: EventLevel;
  kind: string;
  message: string | null;
  path: string | null;
  detail: Record<string, unknown> | null;
};

/** Events since a date, newest first (for /admin and the daily digest). */
export async function recentEvents(since: Date, limit = 500): Promise<EventRow[]> {
  if (!isSupabaseServiceConfigured()) return [];
  const { data, error } = await createServiceSupabaseClient()
    .from('app_events')
    .select('created_at, level, kind, message, path, detail')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as EventRow[];
}

/** Deletes events older than `days` (called by the daily cron). */
export async function deleteOldEvents(days = 90): Promise<void> {
  if (!isSupabaseServiceConfigured()) return;
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const { error } = await createServiceSupabaseClient().from('app_events').delete().lt('created_at', cutoff);
  if (error) console.error('Failed to delete old app_events:', error.message);
}

/**
 * Plain-text summary of the last day's problems and sign-in activity for the
 * owner's daily email. Returns null when there is nothing worth sending.
 */
export function buildDigest(events: EventRow[]): { subject: string; body: string } | null {
  const problems = events.filter((e) => e.level !== 'info');
  const count = (kind: string) => events.filter((e) => e.kind === kind).length;
  const linkRequested = count('auth.link_requested');
  const signedIn = count('auth.signed_in');
  const loginFailed = count('auth.callback_failed') + count('auth.link_request_failed');
  const limitHits = count('send.limit_reached');
  if (problems.length === 0 && linkRequested === 0 && signedIn === 0) return null;

  const lines: string[] = [];
  lines.push('SendCert, last 24 hours');
  lines.push('');
  lines.push(`Sign-in: ${linkRequested} links requested, ${signedIn} sign-ins, ${loginFailed} failures.`);
  if (limitHits) lines.push(`Monthly limit reached: ${limitHits} times.`);
  lines.push('');

  const realProblems = problems.filter((e) => e.kind !== 'send.limit_reached');
  if (realProblems.length === 0) {
    lines.push('No errors.');
  } else {
    const byKind = new Map<string, number>();
    for (const e of realProblems) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
    lines.push(`Problems (${realProblems.length}):`);
    for (const [kind, n] of Array.from(byKind.entries()).sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${n} × ${kind}`);
    }
    lines.push('');
    lines.push('Latest:');
    for (const e of realProblems.slice(0, 10)) {
      const time = new Date(e.created_at).toISOString().slice(11, 16);
      lines.push(`  ${time} UTC  ${e.kind}${e.path ? `  ${e.path}` : ''}`);
      if (e.message) lines.push(`    ${e.message.slice(0, 200)}`);
    }
  }
  lines.push('');
  lines.push('Details: https://www.sendcert.org/admin');

  const subject =
    realProblems.length > 0
      ? `SendCert: ${realProblems.length} problem${realProblems.length === 1 ? '' : 's'} in the last 24 h`
      : 'SendCert: daily activity';
  return { subject, body: lines.join('\n') };
}
