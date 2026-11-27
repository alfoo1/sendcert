import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import AccountShell from '@/components/account/AccountShell';
import RecipientsTable from '@/components/account/RecipientsTable';
import { getSendDetail, sendDetailPath } from '@/lib/account';
import { LOCALE_TAG, localizePath, tx, type Locale } from '@/lib/i18n';
import { getLoggedInUser } from '@/lib/session';
import { isSupabaseServiceConfigured } from '@/lib/supabase';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sendcert.org').replace(/\/$/, '');

/** One send from the dashboard: recipients, verification links and actions. */
export default async function SendView({ locale, batchId }: { locale: Locale; batchId: string }) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  const user = await getLoggedInUser();
  if (!user) {
    redirect(`${localizePath('/login', locale)}?next=${encodeURIComponent(sendDetailPath(locale, batchId))}`);
  }
  if (!isSupabaseServiceConfigured()) notFound();
  const send = await getSendDetail(user.id, batchId);
  if (!send) notFound();

  const date = new Date(send.createdAt).toLocaleDateString(LOCALE_TAG[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  const stats = [
    send.recipients.length === 1
      ? t('1 recipient', '1 destinatario')
      : t(`${send.recipients.length} recipients`, `${send.recipients.length} destinatarios`),
    t(`${send.linkedInAdds} added to LinkedIn`, `${send.linkedInAdds} lo agregaron a LinkedIn`),
  ];
  if (send.failed) {
    stats.push(t(`${send.failed} could not be delivered`, `${send.failed} no se pudieron entregar`));
  }

  return (
    <AccountShell locale={locale} enPath="/dashboard">
      <Link href={localizePath('/dashboard', locale)} className="text-sm text-gray-500 hover:text-gray-900">
        ← {t('All sends', 'Todos los envíos')}
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{send.credential || t('Certificates', 'Certificados')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {date}
            {send.issuer ? ` · ${send.issuer}` : ''}
          </p>
          <p className="mt-1 text-sm text-gray-600">{stats.join(' · ')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${localizePath('/app', locale)}?batch=${send.batchId}`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {t('Send again with this design', 'Enviar de nuevo con este diseño')}
          </Link>
          <a
            href={`/api/batches/${send.batchId}/csv`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('Download CSV', 'Descargar CSV')}
          </a>
        </div>
      </div>

      {send.failed ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t(
            'Certificates that could not be delivered are not listed below. Check those email addresses and send them again with this design.',
            'Los certificados que no se pudieron entregar no aparecen abajo. Revisa esos correos y vuelve a enviarlos con este diseño.',
          )}
        </p>
      ) : null}

      <RecipientsTable locale={locale} siteUrl={SITE_URL} recipients={send.recipients} />
    </AccountShell>
  );
}
