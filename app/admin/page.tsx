import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getLoggedInUser, isAdminEmail } from '@/lib/session';
import {
  createServiceSupabaseClient,
  isSupabaseServiceConfigured,
} from '@/lib/supabase';
import { PRESET_TEMPLATES } from '@/lib/templates';
import DailyBarChart, { type DailyPoint } from '@/components/admin/DailyBarChart';
import { recentEvents, type EventRow } from '@/lib/events';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

const TZ = 'America/Argentina/Buenos_Aires';
const DAY_MS = 86_400_000;
const CHART_DAYS = 60;

type SendRow = {
  created_at: string;
  user_id: string | null;
  ip_hash: string | null;
  recipients: number;
  sent: number;
  failed: number;
  template: string | null;
};
type UserRow = {
  id: string;
  email: string | null;
  plan: string;
  sends_this_month: number;
  created_at: string;
};
type FeedbackRow = {
  created_at: string;
  rating: number;
  comment: string | null;
  recipient_count: number;
  user_id: string | null;
};
type WaitlistRow = { email: string; reason: string | null; created_at: string };

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }); // YYYY-MM-DD

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: TZ,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function templateLabel(template: string | null): string {
  if (!template) return 'Not recorded';
  if (template === 'custom') return 'Own design (uploaded)';
  const preset = PRESET_TEMPLATES.find((t) => t.id === template);
  return preset ? preset.name : template.charAt(0).toUpperCase() + template.slice(1);
}

function sum(rows: SendRow[], key: 'sent' | 'failed' | 'recipients'): number {
  return rows.reduce((acc, r) => acc + (r[key] ?? 0), 0);
}

function uniqueSenders(rows: SendRow[]): number {
  return new Set(rows.map((r) => r.user_id ?? r.ip_hash ?? 'unknown')).size;
}

function delta(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? 'new' : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}% vs previous 30 days`;
}

async function loadData() {
  const supabase = createServiceSupabaseClient();
  const since = new Date(Date.now() - 365 * DAY_MS).toISOString();
  const since30 = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const [logs, users, feedback, waitlist, certs, certs30, shares, events] = await Promise.all([
    supabase
      .from('send_log')
      .select('created_at, user_id, ip_hash, recipients, sent, failed, template')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10000),
    supabase
      .from('users')
      .select('id, email, plan, sends_this_month, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('feedback')
      .select('created_at, rating, comment, recipient_count, user_id')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('waitlist')
      .select('email, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('certificates_issued').select('id', { count: 'exact', head: true }),
    supabase
      .from('certificates_issued')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since30),
    supabase
      .from('share_events')
      .select('kind, source')
      .gte('created_at', since30)
      .limit(10000),
    // Empty until migration 0008 runs; never breaks the page.
    recentEvents(new Date(Date.now() - 7 * DAY_MS), 1000),
  ]);
  const error =
    logs.error ?? users.error ?? feedback.error ?? waitlist.error ?? certs.error ?? certs30.error;
  return {
    error: error?.message ?? null,
    logs: (logs.data ?? []) as SendRow[],
    users: (users.data ?? []) as UserRow[],
    feedback: (feedback.data ?? []) as FeedbackRow[],
    waitlist: (waitlist.data ?? []) as WaitlistRow[],
    verifiedCount: certs.count ?? 0,
    verified30: certs30.count ?? 0,
    // Missing table (migration 0005 not run yet) shouldn't break the page.
    shares30: (shares.error ? [] : shares.data ?? []) as { kind: string; source: string | null }[],
    events: events as EventRow[],
  };
}

export default async function AdminPage() {
  const user = await getLoggedInUser();
  if (!user) redirect('/login?next=/admin');
  if (!isAdminEmail(user.email)) notFound();

  if (!isSupabaseServiceConfigured()) {
    return <ErrorState message="SUPABASE_SERVICE_ROLE_KEY is not set." />;
  }
  const data = await loadData();
  if (data.error) return <ErrorState message={data.error} />;

  const now = Date.now();
  const last30 = data.logs.filter((r) => now - Date.parse(r.created_at) < 30 * DAY_MS);
  const prev30 = data.logs.filter((r) => {
    const age = now - Date.parse(r.created_at);
    return age >= 30 * DAY_MS && age < 60 * DAY_MS;
  });
  const delivered30 = sum(last30, 'sent');
  const failed30 = sum(last30, 'failed');
  const guestCerts30 = sum(last30.filter((r) => !r.user_id), 'sent');
  const accountCerts30 = delivered30 - guestCerts30;
  const newAccounts30 = data.users.filter((u) => now - Date.parse(u.created_at) < 30 * DAY_MS).length;
  const avgRating = data.feedback.length
    ? data.feedback.reduce((a, f) => a + f.rating, 0) / data.feedback.length
    : null;

  // Daily delivered certificates, last CHART_DAYS days, in Buenos Aires days.
  const byDay = new Map<string, number>();
  for (const r of data.logs) {
    const key = dayKey.format(new Date(r.created_at));
    byDay.set(key, (byDay.get(key) ?? 0) + r.sent);
  }
  const daily: DailyPoint[] = Array.from({ length: CHART_DAYS }, (_, i) => {
    const key = dayKey.format(new Date(now - (CHART_DAYS - 1 - i) * DAY_MS));
    return { date: key, value: byDay.get(key) ?? 0 };
  });

  // Template usage, last 90 days.
  const templates = new Map<string, { label: string; batches: number; certs: number }>();
  for (const r of data.logs.filter((l) => now - Date.parse(l.created_at) < 90 * DAY_MS)) {
    const key = r.template ?? 'none';
    const entry = templates.get(key) ?? { label: templateLabel(r.template), batches: 0, certs: 0 };
    entry.batches += 1;
    entry.certs += r.sent;
    templates.set(key, entry);
  }
  const templateRows = Array.from(templates.values()).sort((a, b) => b.batches - a.batches);
  const maxBatches = Math.max(1, ...templateRows.map((t) => t.batches));

  const emailById = new Map(data.users.map((u) => [u.id, u.email ?? '(no email)']));
  const firstLog = data.logs[data.logs.length - 1];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">SendCert admin</h1>
          <p className="mt-1 text-sm text-gray-500">
            {firstLog
              ? `Send log since ${formatDate(firstLog.created_at)}. Earlier history is only in Resend (last 30 days).`
              : 'No sends logged yet. Every send from now on appears here.'}
          </p>
        </div>
        <nav className="flex gap-4 text-sm">
          <a className="text-gray-600 underline hover:text-gray-900" href="https://vercel.com/alfonso-2467s-projects/sendcert/analytics" target="_blank" rel="noreferrer">
            Visitors (Vercel)
          </a>
          <a className="text-gray-600 underline hover:text-gray-900" href="https://resend.com/emails" target="_blank" rel="noreferrer">
            Emails (Resend)
          </a>
          <Link className="text-gray-600 underline hover:text-gray-900" href="/dashboard">
            My dashboard
          </Link>
        </nav>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-gray-500">Certificates delivered, last 30 days</p>
          <p className="mt-1 text-5xl font-semibold text-gray-900">{delivered30.toLocaleString('en-US')}</p>
          <p className="mt-1 text-xs text-gray-500">
            {delta(delivered30, sum(prev30, 'sent')) ?? 'No previous period'}
            {failed30 > 0 ? ` · ${failed30} failed` : ''}
          </p>
        </div>
        <StatTile label="People sending, last 30 days" value={uniqueSenders(last30)} note={`${last30.length} sends · ${delta(uniqueSenders(last30), uniqueSenders(prev30)) ?? 'no previous period'}`} />
        <StatTile label="Accounts" value={data.users.length} note={`${newAccounts30} new in 30 days · ${data.verifiedCount} verifiable certificates`} />
        <StatTile
          label="Average rating"
          value={avgRating === null ? '—' : avgRating.toFixed(1)}
          note={`${data.feedback.length} rating${data.feedback.length === 1 ? '' : 's'}`}
        />
      </section>

      <ProblemsSection events={data.events} />

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-gray-900">Certificates delivered per day</h2>
          <p className="text-xs text-gray-500">
            Last 30 days: {guestCerts30.toLocaleString('en-US')} by guests ·{' '}
            {accountCerts30.toLocaleString('en-US')} by accounts
          </p>
        </div>
        <div className="mt-4">
          <DailyBarChart data={daily} label="certificates" />
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-gray-500">View as table</summary>
          <table className="mt-2 w-full max-w-sm text-sm">
            <tbody>
              {daily.filter((d) => d.value > 0).reverse().map((d) => (
                <tr key={d.date} className="border-t border-gray-100">
                  <td className="py-1 text-gray-600">{d.date}</td>
                  <td className="py-1 text-right tabular-nums text-gray-900">{d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Verification &amp; sharing, last 30 days</h2>
        <p className="text-xs text-gray-500">
          Clicks on the buttons in the certificate email and on the verification page. Email
          security scanners can open links too, so treat email clicks as an upper bound.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Verification pages created', value: data.verified30, note: `${data.verifiedCount} in total` },
            ...(['linkedin_add', 'linkedin_share', 'copy_link'] as const).map((kind) => {
              const rows = data.shares30.filter((r) => r.kind === kind);
              const fromEmail = rows.filter((r) => r.source === 'email').length;
              return {
                label:
                  kind === 'linkedin_add'
                    ? 'Added to LinkedIn'
                    : kind === 'linkedin_share'
                      ? 'Shared on LinkedIn'
                      : 'Links copied',
                value: rows.length,
                note: kind === 'copy_link' ? 'from the verification page' : `${fromEmail} from email · ${rows.length - fromEmail} from page`,
              };
            }),
          ].map((t) => (
            <div key={t.label}>
              <p className="text-sm text-gray-500">{t.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{t.value}</p>
              <p className="text-xs text-gray-500">{t.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Templates used, last 90 days</h2>
        <p className="text-xs text-gray-500">Sends per template. Own design means the sender uploaded their image.</p>
        {templateRows.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No sends yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {templateRows.map((t) => (
              <li key={t.label} className="grid grid-cols-[10rem_1fr] items-center gap-3 text-sm">
                <span className="truncate text-gray-700">{t.label}</span>
                <span className="flex items-center gap-2">
                  <span className="h-4 rounded-r bg-brand-600" style={{ width: `${(t.batches / maxBatches) * 100}%`, minWidth: 4, maxWidth: 'calc(100% - 9rem)' }} />
                  <span className="whitespace-nowrap text-gray-600">
                    {t.batches} sends · {t.certs} certs
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-semibold text-gray-900">Recent sends</h2>
        <Table
          head={['When', 'Sender', 'Template', 'Recipients', 'Delivered', 'Failed']}
          rows={data.logs.slice(0, 25).map((r) => [
            formatDateTime(r.created_at),
            r.user_id ? emailById.get(r.user_id) ?? 'Account' : 'Guest',
            templateLabel(r.template),
            r.recipients,
            r.sent,
            r.failed,
          ])}
          empty="No sends logged yet."
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-semibold text-gray-900">Feedback</h2>
          <Table
            head={['When', 'Rating', 'Comment']}
            rows={data.feedback.map((f) => [
              formatDate(f.created_at),
              `${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}`,
              f.comment || '—',
            ])}
            empty="No feedback yet."
          />
        </section>
        <section>
          <h2 className="font-semibold text-gray-900">Waitlist</h2>
          <Table
            head={['Email', 'Reason', 'When']}
            rows={data.waitlist.map((w) => [w.email, w.reason ?? '—', formatDate(w.created_at)])}
            empty="Nobody on the waitlist yet."
          />
        </section>
      </div>

      <section className="mt-6">
        <h2 className="font-semibold text-gray-900">Accounts</h2>
        <Table
          head={['Email', 'Joined', 'Plan', 'Sent this month']}
          rows={data.users.map((u) => [u.email ?? '—', formatDate(u.created_at), u.plan, u.sends_this_month])}
          empty="No accounts yet."
        />
      </section>
    </main>
  );
}

function StatTile({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">
        {typeof value === 'number' ? value.toLocaleString('en-US') : value}
      </p>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </div>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: (string | number)[][]; empty: string }) {
  if (rows.length === 0) {
    return <p className="mt-2 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">{empty}</p>;
  }
  return (
    <div className="mt-2 max-h-96 overflow-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-50 text-left text-gray-600">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 ${typeof cell === 'number' ? 'text-right tabular-nums' : 'text-gray-700'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold text-gray-900">SendCert admin</h1>
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Couldn&apos;t load data from Supabase: {message}
        {/api key/i.test(message) && (
          <p className="mt-2">Check SUPABASE_SERVICE_ROLE_KEY in Vercel and redeploy.</p>
        )}
      </div>
    </main>
  );
}

const LEVEL_STYLE: Record<string, string> = {
  error: 'bg-red-50 text-red-700',
  warn: 'bg-amber-50 text-amber-800',
  info: 'bg-gray-100 text-gray-600',
};

/** Sign-in funnel and everything that went wrong in the last 7 days (app_events). */
function ProblemsSection({ events }: { events: EventRow[] }) {
  const count = (kind: string) => events.filter((e) => e.kind === kind).length;
  const problems = events.filter((e) => e.level !== 'info');
  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-gray-900">Problems &amp; sign-in, last 7 days</h2>
      <p className="text-xs text-gray-500">
        Failures users ran into (server and browser) and the sign-in funnel. A summary is emailed daily when
        something happened.
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        {[
          ['Sign-in links requested', count('auth.link_requested')],
          ['Signed in', count('auth.signed_in')],
          ['Sign-in failures', count('auth.callback_failed') + count('auth.link_request_failed')],
          ['Monthly limit reached', count('send.limit_reached')],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-gray-50 p-3">
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
      {problems.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No problems recorded. 🎉</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 text-sm">
          {problems.slice(0, 30).map((e, i) => (
            <li key={`${e.created_at}-${i}`} className="py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${LEVEL_STYLE[e.level] ?? LEVEL_STYLE.info}`}>
                  {e.level}
                </span>
                <span className="font-medium text-gray-900">{e.kind}</span>
                {e.path && <span className="text-xs text-gray-500">{e.path}</span>}
                <span className="ml-auto text-xs text-gray-500">{formatDateTime(e.created_at)}</span>
              </div>
              {e.message && <p className="mt-1 break-words text-gray-600">{e.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
