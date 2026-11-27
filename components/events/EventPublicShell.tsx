import Link from 'next/link';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { localizePath, tx, type Locale } from '@/lib/i18n';
import type { EventRecord } from '@/lib/eventMode/types';

/** Mobile-first frame for the personal event pages (/e/<token>). */
export default function EventPublicShell({
  event,
  token,
  children,
}: {
  event: EventRecord;
  token: string;
  children: React.ReactNode;
}) {
  const locale: Locale = event.locale;
  const t = (en: string, es: string) => tx(locale, { en, es });
  return (
    <LocaleProvider locale={locale}>
      <div className="min-h-screen bg-gray-50">
        <div className="h-1.5" style={{ backgroundColor: event.accentColor }} />
        <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">{children}</main>
        <footer className="mx-auto max-w-2xl px-4 pb-10 text-center text-xs text-gray-500">
          <p>
            {event.organizerName
              ? t(`Sent by ${event.organizerName} via SendCert`, `Enviado por ${event.organizerName} con SendCert`)
              : t('Sent via SendCert', 'Enviado con SendCert')}
          </p>
          <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link href={`/e/${token}/unsubscribe`} className="underline hover:text-gray-800">
              {t('Unsubscribe from emails', 'Darse de baja de los correos')}
            </Link>
            <Link href={localizePath('/privacy', locale)} className="hover:text-gray-800">
              {t('Privacy', 'Privacidad')}
            </Link>
            <Link href={localizePath('/', locale)} className="hover:text-gray-800">
              sendcert.org
            </Link>
          </p>
        </footer>
      </div>
    </LocaleProvider>
  );
}
