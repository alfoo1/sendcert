import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { USER_LIMIT } from '@/lib/quota';

// Per-user data: never prerender or cache this page.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your SendCert dashboard.',
  robots: { index: false, follow: false },
};

// Same constant the send API enforces, so the displayed limit can't drift.
const MONTHLY_LIMIT = USER_LIMIT;

type RecentSend = {
  course_name: string | null;
  recipients: number;
  date: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Supabase isn&apos;t configured yet. Add the connection details in
          <code className="mx-1 rounded bg-gray-100 px-1">.env.local</code>
          and restart the dev server.
        </p>
      </main>
    );
  }

  const cookieStore = cookies();
  const supabase = createServerSupabaseClient({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet) => {
      for (const c of toSet) {
        cookieStore.set({ name: c.name, value: c.value, ...c.options });
      }
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware should have redirected unauthenticated users; this is a
  // belt-and-braces fallback if someone hits the page directly during a
  // race in cookie propagation.
  if (!user) redirect('/login?next=/dashboard');

  const [{ data: appUser }, { data: certs }] = await Promise.all([
    supabase
      .from('users')
      .select('email, name, plan, sends_this_month')
      .eq('id', user.id)
      .single(),
    supabase
      .from('certificates_issued')
      .select('course_name, created_at, recipient_name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const sendsThisMonth = appUser?.sends_this_month ?? 0;
  const plan = appUser?.plan ?? 'free';
  const email = appUser?.email ?? user.email ?? '';

  // Group sends by created_at date + course_name so a 50-recipient send shows
  // up as one row instead of 50.
  const grouped = new Map<string, RecentSend>();
  for (const cert of certs ?? []) {
    const day = (cert.created_at as string).slice(0, 10);
    const key = `${day}::${cert.course_name ?? ''}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.recipients += 1;
    } else {
      grouped.set(key, {
        course_name: cert.course_name as string | null,
        recipients: 1,
        date: day,
      });
    }
  }
  const rows = Array.from(grouped.values()).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Signed in as <span className="font-medium">{email}</span> · plan{' '}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase">
              {plan}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Send new certificates
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Certificates sent this month
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {sendsThisMonth} <span className="text-base font-medium text-gray-400">/ {MONTHLY_LIMIT}</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-brand-600 transition-all"
              style={{
                width: `${Math.min(100, (sendsThisMonth / MONTHLY_LIMIT) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Plan
          </p>
          <p className="mt-2 text-2xl font-bold capitalize text-gray-900">{plan}</p>
          <p className="mt-1 text-sm text-gray-600">
            Includes {MONTHLY_LIMIT} certificates per month.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Recent sends</h2>
        {rows.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
            No certificates sent yet.{' '}
            <Link href="/app" className="font-medium text-brand-600 underline">
              Send your first batch →
            </Link>
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Course</th>
                  <th className="px-4 py-2 font-medium text-right">Recipients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-700">{formatDate(row.date)}</td>
                    <td className="px-4 py-2">{row.course_name || '—'}</td>
                    <td className="px-4 py-2 text-right font-medium">{row.recipients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
