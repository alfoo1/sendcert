import Link from 'next/link';
import { redirect } from 'next/navigation';
import AccountShell from '@/components/account/AccountShell';
import { getAccountUser, getSends, sendDetailPath } from '@/lib/account';
import { listEventsWithCounts } from '@/lib/eventMode/store';
import { formatEventDate } from '@/lib/eventMode/format';
import { eventDashboardPath } from '@/lib/eventMode/paths';
import { LOCALE_TAG, localizePath, tx, type Locale } from '@/lib/i18n';
import { USER_LIMIT } from '@/lib/quota';
import { getLoggedInUser } from '@/lib/session';
import { isSupabaseServiceConfigured } from '@/lib/supabase';

function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(LOCALE_TAG[locale], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

/** First day of next month, when the monthly counter resets. */
function resetDate(locale: Locale): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toLocaleDateString(LOCALE_TAG[locale], { month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** The signed-in dashboard (/dashboard and /es/panel). */
export default async function DashboardView({ locale }: { locale: Locale }) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  const user = await getLoggedInUser();
  if (!user) redirect(`${localizePath('/login', locale)}?next=${encodeURIComponent(localizePath('/dashboard', locale))}`);
  if (!isSupabaseServiceConfigured()) {
    return (
      <AccountShell locale={locale} enPath="/dashboard">
        <p className="text-gray-600">{t('The dashboard is not available right now.', 'El panel no está disponible en este momento.')}</p>
      </AccountShell>
    );
  }

  const [account, sends, events] = await Promise.all([
    getAccountUser(user.id, user.email),
    getSends(user.id),
    // Empty until migration 0010 runs; never breaks the dashboard.
    listEventsWithCounts(user.id).catch(() => []),
  ]);
  const pct = Math.min(100, Math.round((account.sendsThisMonth / USER_LIMIT) * 100));
  const appPath = localizePath('/app', locale);

  return (
    <AccountShell locale={locale} enPath="/dashboard">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('Your sends', 'Tus envíos')}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {t('Signed in as', 'Sesión iniciada como')} <span className="font-medium">{account.email}</span> ·{' '}
        {t('free plan', 'plan gratuito')}
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {t('Certificates sent this month', 'Certificados enviados este mes')}
          </p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {account.sendsThisMonth}
            <span className="text-lg font-normal text-gray-400"> / {USER_LIMIT}</span>
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full ${pct >= 90 ? 'bg-amber-500' : 'bg-brand-600'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {t(`Resets on ${resetDate(locale)}.`, `Se reinicia el ${resetDate(locale)}.`)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {t('From your AI assistant', 'Desde tu asistente de IA')}
          </p>
          <p className="mt-2 text-sm text-gray-700">
            {t(
              'Connect SendCert to Claude, ChatGPT or Gemini and prepare certificates from a chat.',
              'Conecta SendCert a Claude, ChatGPT o Gemini y prepara certificados desde un chat.',
            )}
          </p>
          <Link href={localizePath('/ai-assistants', locale)} className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">
            {t('How to connect →', 'Cómo conectarlo →')}
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{t('Events', 'Eventos')}</h2>
          <Link href={localizePath('/events/new', locale)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50">
            + {t('Send a pre-event invite', 'Enviar una invitación previa')}
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            {t(
              'Invite people before your event, see who is coming and get them sharing on LinkedIn.',
              'Invita a la gente antes de tu evento, mira quién va y logra que lo compartan en LinkedIn.',
            )}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={eventDashboardPath(locale, e.id)} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                  <span>
                    <span className="font-medium text-gray-900">{e.name}</span>
                    <span className="ml-2 text-sm text-gray-500">{formatEventDate(e, locale, 'short') ?? ''}</span>
                  </span>
                  <span className="flex gap-3 text-xs">
                    <span className="text-green-700">{e.counts.coming} {t('coming', 'van')}</span>
                    <span className="text-red-700">{e.counts.notComing} {t('not coming', 'no van')}</span>
                    <span className="text-amber-700">{e.counts.noAnswer} {t('no answer', 'sin respuesta')}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">{t('Sends', 'Envíos')}</h2>
        {sends.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
            {t('No certificates sent yet.', 'Todavía no enviaste certificados.')}{' '}
            <Link href={appPath} className="font-medium text-brand-600 underline">
              {t('Send your first batch →', 'Envía tu primer lote →')}
            </Link>
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">{t('Date', 'Fecha')}</th>
                  <th className="px-4 py-2 font-medium">{t('Certificate', 'Certificado')}</th>
                  <th className="px-4 py-2 text-right font-medium">{t('Recipients', 'Destinatarios')}</th>
                  <th className="px-4 py-2 font-medium">
                    <span className="sr-only">{t('Actions', 'Acciones')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sends.map((send) => (
                  <tr key={send.batchId ?? `${send.createdAt}-${send.credential}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(send.createdAt, locale)}</td>
                    <td className="px-4 py-3">
                      {send.batchId ? (
                        <Link href={sendDetailPath(locale, send.batchId)} className="font-medium text-gray-900 hover:text-brand-700">
                          {send.credential || '—'}
                        </Link>
                      ) : (
                        send.credential || '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{send.recipients}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                      {send.batchId && (
                        <span className="flex justify-end gap-3">
                          <Link href={sendDetailPath(locale, send.batchId)} className="font-medium text-brand-600 hover:underline">
                            {t('View', 'Ver')}
                          </Link>
                          <Link href={`${appPath}?batch=${send.batchId}`} className="text-gray-600 hover:text-gray-900 hover:underline">
                            {t('Reuse design', 'Reusar diseño')}
                          </Link>
                          <a href={`/api/batches/${send.batchId}/csv`} className="text-gray-600 hover:text-gray-900 hover:underline">
                            CSV
                          </a>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AccountShell>
  );
}
