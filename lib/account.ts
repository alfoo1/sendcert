import { createServiceSupabaseClient } from '@/lib/supabase';
import { isLocale, localizePath, type Locale } from '@/lib/i18n';
import type { TextOverlay } from '@/lib/certificates';

// Data for the signed-in dashboard (/dashboard, /es/panel). Every query is
// scoped to the user id the caller already authenticated, through the
// service role, so other accounts' rows are never returned.

export type AccountUser = {
  email: string;
  plan: string;
  sendsThisMonth: number;
};

export type SendSummary = {
  // Batch id for sends with verification; null for very old certificates.
  batchId: string | null;
  createdAt: string;
  credential: string | null;
  recipients: number;
};

export type Recipient = {
  verifyId: string;
  name: string;
  email: string | null;
  linkedInAdded: boolean;
};

export type SendDetail = {
  batchId: string;
  createdAt: string;
  locale: Locale;
  credential: string | null;
  issuer: string | null;
  issuedDate: string | null;
  recipients: Recipient[];
  // Deliveries that failed (only known for sends after November 2026).
  failed: number | null;
  linkedInAdds: number;
};

export type BatchDesign = {
  createdAt: string;
  locale: Locale;
  templateImage: string;
  textConfig: TextOverlay;
  extraFields: (TextOverlay & { text: string })[];
  email: { subject: string | null; body: string | null; replyTo: string | null };
  credential: string | null;
  issuer: string | null;
};

/** /dashboard in the right language, plus the per-send detail path. */
export function dashboardPath(locale: Locale): string {
  return localizePath('/dashboard', locale);
}
export function sendDetailPath(locale: Locale, batchId: string): string {
  return locale === 'es' ? `/es/panel/envios/${batchId}` : `/dashboard/sends/${batchId}`;
}

function startOfMonthUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export async function getAccountUser(userId: string, fallbackEmail: string | null): Promise<AccountUser> {
  const { data } = await createServiceSupabaseClient()
    .from('users')
    .select('email, plan, sends_this_month, sends_month_anchor')
    .eq('id', userId)
    .maybeSingle();
  // The counter only rolls over on the next send, so an old month reads as 0.
  const current = data && (data.sends_month_anchor as string) >= startOfMonthUtc();
  return {
    email: (data?.email as string | null) ?? fallbackEmail ?? '',
    plan: (data?.plan as string | null) ?? 'free',
    sendsThisMonth: current ? (data?.sends_this_month as number) ?? 0 : 0,
  };
}

/** The account's sends, newest first (one row per batch). */
export async function getSends(userId: string): Promise<SendSummary[]> {
  const { data } = await createServiceSupabaseClient()
    .from('certificates_issued')
    .select('batch_id, course_name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5000);
  const groups = new Map<string, SendSummary>();
  for (const row of data ?? []) {
    const batchId = (row.batch_id as string | null) ?? null;
    const createdAt = row.created_at as string;
    const credential = (row.course_name as string | null) ?? null;
    const key = batchId ?? `${createdAt.slice(0, 10)}::${credential ?? ''}`;
    const group = groups.get(key);
    if (group) {
      group.recipients += 1;
      if (createdAt < group.createdAt) group.createdAt = createdAt;
    } else {
      groups.set(key, { batchId, createdAt, credential, recipients: 1 });
    }
  }
  return Array.from(groups.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** LinkedIn "add to profile" clicks per verification id. */
async function linkedInAdds(verifyIds: string[]): Promise<Set<string>> {
  const added = new Set<string>();
  const supabase = createServiceSupabaseClient();
  for (let i = 0; i < verifyIds.length; i += 100) {
    const { data } = await supabase
      .from('share_events')
      .select('verify_id')
      .eq('kind', 'linkedin_add')
      .in('verify_id', verifyIds.slice(i, i + 100));
    for (const row of data ?? []) added.add(row.verify_id as string);
  }
  return added;
}

/** One send with its recipients, or null if it isn't this account's. */
export async function getSendDetail(userId: string, batchId: string): Promise<SendDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(batchId)) return null;
  const supabase = createServiceSupabaseClient();
  const { data: batch } = await supabase
    .from('certificate_batches')
    .select('id, created_at, locale')
    .eq('id', batchId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!batch) return null;

  const [{ data: certs }, { data: logs }] = await Promise.all([
    supabase
      .from('certificates_issued')
      .select('verify_id, recipient_name, recipient_email, course_name, issuer_name, issued_date')
      .eq('batch_id', batchId)
      .eq('user_id', userId)
      .order('recipient_name', { ascending: true })
      .limit(5000),
    supabase.from('send_log').select('failed').eq('batch_id', batchId),
  ]);
  const rows = certs ?? [];
  const added = await linkedInAdds(rows.map((r) => r.verify_id as string));
  const first = rows[0];
  return {
    batchId,
    createdAt: batch.created_at as string,
    locale: isLocale(batch.locale) ? batch.locale : 'en',
    credential: (first?.course_name as string | null) ?? null,
    issuer: (first?.issuer_name as string | null) ?? null,
    issuedDate: (first?.issued_date as string | null) ?? null,
    recipients: rows.map((r) => ({
      verifyId: r.verify_id as string,
      name: r.recipient_name as string,
      email: (r.recipient_email as string | null) ?? null,
      linkedInAdded: added.has(r.verify_id as string),
    })),
    failed: logs && logs.length > 0 ? logs.reduce((sum, l) => sum + ((l.failed as number) ?? 0), 0) : null,
    linkedInAdds: added.size,
  };
}

/** The stored design and message of a send, or null if it isn't this account's. */
export async function getBatchDesign(userId: string, batchId: string): Promise<BatchDesign | null> {
  if (!/^[0-9a-f-]{36}$/i.test(batchId)) return null;
  const supabase = createServiceSupabaseClient();
  const { data: batch } = await supabase
    .from('certificate_batches')
    .select('created_at, locale, template_image, text_config, extra_fields, email_subject, email_body, reply_to')
    .eq('id', batchId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!batch) return null;
  const { data: cert } = await supabase
    .from('certificates_issued')
    .select('course_name, issuer_name')
    .eq('batch_id', batchId)
    .limit(1)
    .maybeSingle();
  return {
    createdAt: batch.created_at as string,
    locale: isLocale(batch.locale) ? batch.locale : 'en',
    templateImage: batch.template_image as string,
    textConfig: batch.text_config as TextOverlay,
    extraFields: (batch.extra_fields ?? []) as (TextOverlay & { text: string })[],
    email: {
      subject: (batch.email_subject as string | null) ?? null,
      body: (batch.email_body as string | null) ?? null,
      replyTo: (batch.reply_to as string | null) ?? null,
    },
    credential: (cert?.course_name as string | null) ?? null,
    issuer: (cert?.issuer_name as string | null) ?? null,
  };
}
