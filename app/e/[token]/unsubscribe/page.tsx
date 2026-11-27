import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import EventPublicShell from '@/components/events/EventPublicShell';
import UnsubscribeButton from '@/components/events/UnsubscribeButton';
import { lookupPublicToken } from '@/lib/eventMode/publicAccess';
import { tx } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };

/** "Unsubscribe from emails" (separate from "I can't make it"). */
export default async function UnsubscribePage({ params }: { params: { token: string } }) {
  const result = await lookupPublicToken(headers(), params.token, 'page');
  if (result.status !== 'ok') notFound();
  const { event, recipient } = result;
  const t = (en: string, es: string) => tx(event.locale, { en, es });
  return (
    <EventPublicShell event={event} token={recipient.token}>
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-bold text-gray-900">{t('Unsubscribe from emails', 'Darse de baja de los correos')}</h1>
        <p className="mt-2 text-gray-700">
          {t(
            `Stop receiving emails from ${event.organizerName ?? 'this organizer'} sent through SendCert. This doesn't change your answer about attending.`,
            `Deja de recibir correos de ${event.organizerName ?? 'este organizador'} enviados con SendCert. No cambia tu respuesta sobre si vas a ir.`,
          )}
        </p>
        <div className="mt-5">
          {recipient.unsubscribed ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-700">{t('You are already unsubscribed.', 'Ya estás dado de baja.')}</p>
          ) : (
            <UnsubscribeButton token={recipient.token} locale={event.locale} organizer={event.organizerName} />
          )}
        </div>
        <Link href={`/e/${recipient.token}`} className="mt-6 inline-block text-sm text-gray-600 underline">
          {t('← Back to the event', '← Volver al evento')}
        </Link>
      </div>
    </EventPublicShell>
  );
}
