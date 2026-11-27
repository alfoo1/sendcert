import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '@/lib/supabase';

// Safety cap on emails per day for the whole SendCert account. Resend Pro has
// no daily limit (50,000 a month), so this is ~50,000 / 30: enough for any
// event's invites in one go, and a brake if something runs away. Invites
// never start a send that can't finish: they send what fits today and leave
// the rest for the next day.
export const DAILY_EMAIL_LIMIT = Number(process.env.EMAIL_DAILY_LIMIT ?? 1500);

const devCounter: { day: string; sent: number } = ((globalThis as { __sendcertDaily?: { day: string; sent: number } }).__sendcertDaily ??= {
  day: '',
  sent: 0,
});

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Emails SendCert sent today (UTC), across every sender. */
export async function emailsSentToday(): Promise<number> {
  if (!isSupabaseServiceConfigured()) return devCounter.day === todayUtc() ? devCounter.sent : 0;
  const { data } = await createServiceSupabaseClient()
    .from('send_log')
    .select('sent')
    .gte('created_at', `${todayUtc()}T00:00:00Z`)
    .limit(10000);
  return (data ?? []).reduce((sum, row) => sum + ((row.sent as number) ?? 0), 0);
}

export async function remainingToday(): Promise<number> {
  return Math.max(0, DAILY_EMAIL_LIMIT - (await emailsSentToday()));
}

/** Local development only: count sends that never reach the database. */
export function countDevSends(n: number) {
  if (isSupabaseServiceConfigured()) return;
  if (devCounter.day !== todayUtc()) {
    devCounter.day = todayUtc();
    devCounter.sent = 0;
  }
  devCounter.sent += n;
}
