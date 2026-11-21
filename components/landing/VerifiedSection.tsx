import Link from 'next/link';
import { serif } from '@/components/landing/fonts';
import { localizePath, tx, type Locale, type Tx } from '@/lib/i18n';

const POINTS: { title: Tx; description: Tx }[] = [
  {
    title: { en: 'A unique ID and a public page', es: 'Un ID único y una página pública' },
    description: {
      en: 'Every certificate gets its own link, like sendcert.org/verify/CERT-2026-…, showing who received it, who issued it and when.',
      es: 'Cada certificado tiene su propio enlace, como sendcert.org/verify/CERT-2026-…, que muestra quién lo recibió, quién lo emitió y cuándo.',
    },
  },
  {
    title: { en: 'One click to LinkedIn', es: 'A LinkedIn con un clic' },
    description: {
      en: 'Recipients can add it to the Licenses & certifications section of their profile, or share it in a post, right from the email.',
      es: 'Quien lo recibe puede agregarlo a la sección Licencias y certificaciones de su perfil, o compartirlo en una publicación, directo desde el correo.',
    },
  },
  {
    title: { en: 'Hard to fake', es: 'Difícil de falsificar' },
    description: {
      en: "An edited PDF won't match its verification page. Employers, schools and licensing boards can check it's real in seconds.",
      es: 'Un PDF editado no va a coincidir con su página de verificación. Empleadores, escuelas y entidades certificadoras pueden comprobar que es auténtico en segundos.',
    },
  },
];

const EXAMPLE_ID = 'CERT-2026-K7QM-4TXP';

// Landing section that sells the verification page. The card on the right is
// an HTML mock of /verify/[id] with sample data; it's decorative only.
export default function VerifiedSection({ locale = 'en' }: { locale?: Locale }) {
  return (
    <section id="verification" className="scroll-mt-20 border-t border-gray-100 bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            {tx(locale, { en: 'Verifiable by default', es: 'Verificables por defecto' })}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {tx(locale, {
              en: 'Certificates people are proud to share, and anyone can check',
              es: 'Certificados que la gente quiere compartir y que cualquiera puede verificar',
            })}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {tx(locale, {
              en: 'Every certificate you send comes with its own verification page. Free, with no sign-up for you or your recipients.',
              es: 'Cada certificado que envías incluye su propia página de verificación. Gratis y sin registro, ni para ti ni para tus destinatarios.',
            })}
          </p>

          <ul className="mt-8 space-y-5">
            {POINTS.map((point) => (
              <li key={point.title.en} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{tx(locale, point.title)}</p>
                  <p className="mt-1 text-gray-600">{tx(locale, point.description)}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-8 border-l-2 border-brand-200 pl-4 text-sm leading-relaxed text-gray-500">
            {tx(locale, {
              en: "Verifiable certificates shouldn't be a premium feature. SendCert makes them free for every teacher, trainer and nonprofit.",
              es: 'Los certificados verificables no deberían ser un lujo. SendCert los hace gratis para cada docente, capacitador y ONG.',
            })}
          </p>

          <Link
            href={localizePath('/app', locale)}
            className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
          >
            {tx(locale, {
              en: 'Send verifiable certificates →',
              es: 'Envía certificados verificables →',
            })}
          </Link>
        </div>

        <VerificationMock locale={locale} />
      </div>
    </section>
  );
}

function VerificationMock({ locale }: { locale: Locale }) {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-green-50 via-white to-brand-50 sm:-inset-6" />

      <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        {/* Address bar */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
          <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 2a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4Zm2 6V6a2 2 0 1 0-4 0v2h4Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="truncate font-mono text-xs text-gray-500">
            sendcert.org/verify/{EXAMPLE_ID}
          </span>
        </div>

        <div className="p-5 sm:p-6">
          {/* Status */}
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-green-900">
                {tx(locale, { en: 'Verified certificate', es: 'Certificado verificado' })}
              </p>
              <p className="truncate text-xs text-green-800">
                {tx(locale, { en: 'Issued through SendCert', es: 'Emitido a través de SendCert' })}
              </p>
            </div>
          </div>

          {/* Mini certificate */}
          <div className="mt-4 rounded-lg border border-gray-200 bg-[#fdfcf9] p-1.5">
            <div className="rounded border border-amber-700/30 px-4 py-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800/80">
                {tx(locale, { en: 'Certificate of completion', es: 'Certificado de finalización' })}
              </p>
              <p className={`${serif.className} mt-2 text-xl font-semibold text-gray-900 sm:text-2xl`}>
                María José Núñez
              </p>
              <p className="mt-1.5 text-[11px] text-gray-500">
                {tx(locale, { en: 'Teaching Smarter with AI', es: 'Enseñar mejor con IA' })}
              </p>
            </div>
          </div>

          {/* Details */}
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                {tx(locale, { en: 'Issued by', es: 'Emitido por' })}
              </dt>
              <dd className="mt-0.5 font-medium text-gray-900">
                {tx(locale, { en: 'Riverside Teachers Network', es: 'Red de Docentes del Sur' })}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                {tx(locale, { en: 'Issue date', es: 'Fecha de emisión' })}
              </dt>
              <dd className="mt-0.5 font-medium text-gray-900">
                {tx(locale, { en: 'Nov 21, 2026', es: '21 nov 2026' })}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                {tx(locale, { en: 'Credential ID', es: 'ID de la credencial' })}
              </dt>
              <dd className="mt-0.5 font-mono text-sm text-gray-900">{EXAMPLE_ID}</dd>
            </div>
          </dl>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0A66C2] px-3 py-2 text-sm font-semibold text-white">
              <LinkedInIcon />
              {tx(locale, { en: 'Add to LinkedIn', es: 'Agregar a LinkedIn' })}
            </span>
            <span className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">
              {tx(locale, { en: 'Copy link', es: 'Copiar enlace' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}
