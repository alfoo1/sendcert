import { createHash } from 'node:crypto';
import {
  createServiceSupabaseClient,
  isSupabaseServiceConfigured,
} from '@/lib/supabase';
import { tryConsume } from '@/lib/rateLimit';

export const GUEST_LIMIT = Number(process.env.RATE_LIMIT_GUEST_PER_MONTH ?? 100);
// RATE_LIMIT_USER_PER_MONTH replaces the old RATE_LIMIT_PER_MONTH variable,
// which is ignored now so a stale value in Vercel can't lower the cap.
export const USER_LIMIT = Number(process.env.RATE_LIMIT_USER_PER_MONTH ?? 300);

export type Quota = {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
};

/** Salted hash so raw IPs are never stored. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? 'sendcert';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

function toQuota(allowed: boolean, used: number, limit: number): Quota {
  return { allowed, used, limit, remaining: Math.max(0, limit - used) };
}

async function callQuotaRpc(
  fn: 'consume_user_quota' | 'consume_guest_quota',
  args: Record<string, unknown>,
  limit: number,
): Promise<Quota> {
  const { data, error } = await createServiceSupabaseClient().rpc(fn, args);
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) {
    // Fail open: a database hiccup shouldn't stop people from sending.
    console.error(`${fn} failed:`, error);
    return toQuota(true, 0, limit);
  }
  return toQuota(Boolean(row.allowed), Number(row.used), limit);
}

/** Reserves `amount` sends (negative refunds) against a user's monthly cap. */
export async function consumeUserQuota(userId: string, amount: number): Promise<Quota> {
  if (!isSupabaseServiceConfigured()) return toQuota(true, 0, USER_LIMIT);
  return callQuotaRpc(
    'consume_user_quota',
    { p_user_id: userId, p_amount: amount, p_limit: USER_LIMIT },
    USER_LIMIT,
  );
}

/** Same as consumeUserQuota but keyed by hashed IP, with the guest cap. */
export async function consumeGuestQuota(ipHash: string, amount: number): Promise<Quota> {
  if (!isSupabaseServiceConfigured()) {
    // Local dev without Supabase: per-process counter is good enough.
    const { allowed, status } = tryConsume(ipHash, amount, GUEST_LIMIT);
    return toQuota(allowed, status.used, GUEST_LIMIT);
  }
  return callQuotaRpc(
    'consume_guest_quota',
    { p_ip_hash: ipHash, p_amount: amount, p_limit: GUEST_LIMIT },
    GUEST_LIMIT,
  );
}

/** Records one send batch (counts only) for long-term usage stats. */
export async function logSend(entry: {
  userId: string | null;
  ipHash: string;
  template: string | null;
  recipients: number;
  sent: number;
  failed: number;
  batchId?: string | null;
  // Event emails (migration 0010): which event and what kind of email.
  eventId?: string | null;
  kind?: 'certificate' | 'invite';
}): Promise<void> {
  if (!isSupabaseServiceConfigured()) return;
  const { error } = await createServiceSupabaseClient().from('send_log').insert({
    batch_id: entry.batchId ?? null,
    ...(entry.eventId ? { event_id: entry.eventId, kind: entry.kind ?? 'invite' } : {}),
    user_id: entry.userId,
    ip_hash: entry.ipHash,
    template: entry.template,
    recipients: entry.recipients,
    sent: entry.sent,
    failed: entry.failed,
  });
  if (error) console.error('send_log insert failed:', error);
}
