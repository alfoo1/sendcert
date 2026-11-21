import Link from 'next/link';
import { localizePath, tx, type Locale, type Tx } from '@/lib/i18n';

const PLANS: {
  name: Tx;
  tagline: Tx;
  limit: Tx;
  features: Tx[];
  cta: { label: Tx; enPath: string };
  highlighted: boolean;
}[] = [
  {
    name: { en: 'As a guest', es: 'Como invitado' },
    tagline: { en: 'No account needed', es: 'No necesitas cuenta' },
    limit: { en: '100 certificates / month', es: '100 certificados / mes' },
    features: [
      { en: 'All templates or your own design', es: 'Todas las plantillas o tu propio diseño' },
      { en: 'PDF certificate by email', es: 'Certificado en PDF por correo' },
      { en: 'Verification link for every certificate', es: 'Enlace de verificación en cada certificado' },
      { en: 'Add to LinkedIn in one click', es: 'Agregar a LinkedIn con un clic' },
    ],
    cta: { label: { en: 'Start sending', es: 'Empezar a enviar' }, enPath: '/app' },
    highlighted: false,
  },
  {
    name: { en: 'Free account', es: 'Cuenta gratuita' },
    tagline: {
      en: 'Sign in with an email link, no password',
      es: 'Ingresas con un enlace por correo, sin contraseña',
    },
    limit: { en: '300 certificates / month', es: '300 certificados / mes' },
    features: [
      { en: 'Everything in guest', es: 'Todo lo de invitado' },
      { en: '300 certificates a month', es: '300 certificados al mes' },
      { en: 'History of your sends', es: 'Historial de tus envíos' },
    ],
    cta: { label: { en: 'Create a free account', es: 'Crear una cuenta gratis' }, enPath: '/login' },
    highlighted: true,
  },
];

export default function FreePlans({ locale = 'en' }: { locale?: Locale }) {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-5 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {tx(locale, { en: 'Free to use', es: 'Gratis para usar' })}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {tx(locale, {
              en: 'No credit card. Limits reset every month.',
              es: 'Sin tarjeta de crédito. Los límites se reinician cada mes.',
            })}
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name.en}
              className={`flex flex-col rounded-2xl border bg-white p-7 ${
                plan.highlighted ? 'border-brand-600 shadow-lg ring-1 ring-brand-600' : 'border-gray-200'
              }`}
            >
              <h3 className="text-lg font-semibold text-gray-900">{tx(locale, plan.name)}</h3>
              <p className="mt-1 text-sm text-gray-500">{tx(locale, plan.tagline)}</p>
              <p className="mt-5 text-2xl font-bold text-gray-900">{tx(locale, plan.limit)}</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-gray-700">
                {plan.features.map((feature) => (
                  <li key={feature.en} className="flex gap-2">
                    <span className="text-brand-600" aria-hidden>
                      ✓
                    </span>
                    {tx(locale, feature)}
                  </li>
                ))}
              </ul>
              <Link
                href={localizePath(plan.cta.enPath, locale)}
                className={`mt-7 inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition ${
                  plan.highlighted
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tx(locale, plan.cta.label)}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
