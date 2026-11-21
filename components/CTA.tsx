import Link from 'next/link';
import { localizePath, tx, type Locale } from '@/lib/i18n';

export default function CTA({ locale = 'en' }: { locale?: Locale }) {
  return (
    <section className="bg-brand-600 py-20">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {tx(locale, {
            en: 'Send your first certificates today',
            es: 'Envía tus primeros certificados hoy',
          })}
        </h2>
        <p className="mt-4 text-lg text-brand-100">
          {tx(locale, {
            en: 'Free, no credit card. Every certificate comes with its own verification link. 100 a month without an account, 300 with a free one.',
            es: 'Gratis y sin tarjeta de crédito. Cada certificado incluye su propio enlace de verificación. 100 al mes sin cuenta, 300 con una cuenta gratuita.',
          })}
        </p>
        <div className="mt-8">
          <Link
            href={localizePath('/app', locale)}
            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
          >
            {tx(locale, { en: 'Create certificates free →', es: 'Crea certificados gratis →' })}
          </Link>
        </div>
      </div>
    </section>
  );
}
