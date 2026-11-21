import Link from 'next/link';
import { sans } from '@/components/landing/fonts';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { localizePath, tx, type Locale, type Tx } from '@/lib/i18n';

export const ORGS_TITLE: Tx = {
  en: 'Certificate software for schools, training providers and nonprofits',
  es: 'Software de certificados para escuelas, centros de capacitación y ONG',
};
export const ORGS_DESCRIPTION: Tx = {
  en: 'Issue verifiable certificates for courses, trainings and events. Bulk send from a spreadsheet, your own branding, a verification page for every certificate and one-click Add to LinkedIn.',
  es: 'Emite certificados verificables para cursos, capacitaciones y eventos. Envío masivo desde una hoja de cálculo, la imagen de tu organización, una página de verificación para cada certificado y “Agregar a LinkedIn” con un clic.',
};

const CONTACT: Tx = {
  en: 'mailto:hola@sendcert.org?subject=SendCert%20for%20our%20organization',
  es: 'mailto:hola@sendcert.org?subject=SendCert%20para%20nuestra%20organizaci%C3%B3n',
};

const AUDIENCES: { title: Tx; text: Tx }[] = [
  {
    title: { en: 'Schools and universities', es: 'Escuelas y universidades' },
    text: {
      en: 'Professional development for teachers, continuing education, workshops and student programs.',
      es: 'Formación docente, educación continua, talleres y programas para estudiantes.',
    },
  },
  {
    title: { en: 'Training providers', es: 'Centros de capacitación' },
    text: {
      en: 'Course completions, bootcamps and train-the-trainer programs, issued the day the course ends.',
      es: 'Cursos completados, bootcamps y programas de formación de formadores, con el certificado emitido el mismo día que termina el curso.',
    },
  },
  {
    title: { en: 'Nonprofits and public agencies', es: 'ONG y organismos públicos' },
    text: {
      en: 'Volunteer, child-safety and community trainings that people need to prove they completed.',
      es: 'Capacitaciones para voluntarios, de protección infantil y comunitarias, que las personas necesitan poder acreditar.',
    },
  },
  {
    title: { en: 'HR and L&D teams', es: 'Equipos de RR. HH. y capacitación' },
    text: {
      en: 'Internal trainings, onboarding and compliance courses, with a record of who received what.',
      es: 'Capacitaciones internas, inducción y cursos obligatorios, con un registro de quién recibió qué.',
    },
  },
  {
    title: { en: 'Conferences and webinars', es: 'Congresos y webinars' },
    text: {
      en: 'Certificates of attendance for every participant, sent minutes after the event.',
      es: 'Certificados de asistencia para cada participante, enviados minutos después del evento.',
    },
  },
];

const FEATURES: { title: Tx; text: Tx }[] = [
  {
    title: { en: 'Bulk issuing from a spreadsheet', es: 'Emisión masiva desde una hoja de cálculo' },
    text: {
      en: 'Upload a CSV or Excel file, or paste a list. Every person gets their own personalized PDF by email.',
      es: 'Sube un archivo CSV o Excel, o pega una lista. Cada persona recibe su propio PDF personalizado por correo.',
    },
  },
  {
    title: { en: 'Your organization’s branding', es: 'La imagen de tu organización' },
    text: {
      en: 'Start from a professional template with your logo and colors, or upload your own certificate design.',
      es: 'Empieza con una plantilla profesional con tu logo y tus colores, o sube tu propio diseño de certificado.',
    },
  },
  {
    title: {
      en: 'A verification page for every certificate',
      es: 'Una página de verificación para cada certificado',
    },
    text: {
      en: 'Each certificate has a unique ID and a public page that shows your organization as the issuer, so an edited PDF can’t pass as real.',
      es: 'Cada certificado tiene un ID único y una página pública que muestra a tu organización como emisora, así un PDF editado no puede pasar por auténtico.',
    },
  },
  {
    title: { en: 'Add to LinkedIn in one click', es: 'Agregar a LinkedIn con un clic' },
    text: {
      en: 'Recipients add the credential to their profile with your organization’s name on it, which puts your program in front of their network.',
      es: 'Quienes reciben el certificado lo agregan a su perfil con el nombre de tu organización, y así tu programa llega a toda su red de contactos.',
    },
  },
  {
    title: { en: 'Replies come to you', es: 'Las respuestas te llegan a ti' },
    text: {
      en: 'Set your own reply-to address so questions and thank-you notes from participants reach your team.',
      es: 'Configura tu propia dirección de respuesta para que las preguntas y los agradecimientos de los participantes lleguen a tu equipo.',
    },
  },
  {
    title: { en: 'Delivery report and privacy', es: 'Reporte de entrega y privacidad' },
    text: {
      en: 'See who received their certificate and download any failures. Verification pages are kept out of search engines and never show email addresses.',
      es: 'Ve quién recibió su certificado y descarga los envíos que fallaron. Las páginas de verificación no aparecen en los buscadores y nunca muestran direcciones de correo.',
    },
  },
];

const STEPS: { title: Tx; text: Tx }[] = [
  {
    title: { en: 'Design', es: 'Diseña' },
    text: {
      en: 'Pick a template or upload your own design, and add your logo.',
      es: 'Elige una plantilla o sube tu propio diseño, y agrega tu logo.',
    },
  },
  {
    title: { en: 'Upload participants', es: 'Sube a los participantes' },
    text: {
      en: 'Import a CSV or Excel file, or paste names and emails.',
      es: 'Importa un archivo CSV o Excel, o pega nombres y correos.',
    },
  },
  {
    title: { en: 'Send', es: 'Envía' },
    text: {
      en: 'Everyone gets their PDF and verification link by email, in minutes.',
      es: 'Cada persona recibe su PDF y su enlace de verificación por correo, en minutos.',
    },
  },
];

const FAQ: { q: Tx; a: Tx }[] = [
  {
    q: {
      en: 'Can we use our own certificate design?',
      es: '¿Podemos usar nuestro propio diseño de certificado?',
    },
    a: {
      en: 'Yes. Upload a PNG or JPG of your design and position the recipient’s name on it, or start from one of the built-in templates and add your logo and colors.',
      es: 'Sí. Sube un PNG o JPG de tu diseño y ubica el nombre del destinatario sobre él, o empieza con una de las plantillas incluidas y agrega tu logo y tus colores.',
    },
  },
  {
    q: {
      en: 'How do employers or licensing boards check a certificate?',
      es: '¿Cómo comprueba un empleador o una entidad certificadora que un certificado es auténtico?',
    },
    a: {
      en: 'Every certificate links to a page on sendcert.org with the recipient’s name, the certificate name, your organization as the issuer, the date and a unique ID. If a PDF doesn’t match that page, it isn’t genuine.',
      es: 'Cada certificado enlaza a una página en sendcert.org con el nombre del destinatario, el nombre del certificado, tu organización como emisora, la fecha y un ID único. Si un PDF no coincide con esa página, no es auténtico.',
    },
  },
  {
    q: { en: 'How many certificates can we send?', es: '¿Cuántos certificados podemos enviar?' },
    a: {
      en: 'Up to 300 a month with a free account, and 100 a month without one. If your organization needs more, write to us and we’ll work it out with you.',
      es: 'Hasta 300 por mes con una cuenta gratuita, y 100 por mes sin cuenta. Si tu organización necesita más, escríbenos y lo resolvemos contigo.',
    },
  },
  {
    q: { en: 'What data do you keep?', es: '¿Qué datos guardan?' },
    a: {
      en: 'Only what verification needs: the recipient’s name, the certificate name, the issuer, the date and the certificate design. Sends from an account also keep recipient emails for your history. You can turn verification off for any send.',
      es: 'Solo lo que la verificación necesita: el nombre del destinatario, el nombre del certificado, quién lo emitió, la fecha y el diseño del certificado. Los envíos desde una cuenta también guardan los correos de los destinatarios para tu historial. Puedes desactivar la verificación en cualquier envío.',
    },
  },
];

export default function OrganizationsPage({ locale }: { locale: Locale }) {
  const t = (c: Tx) => tx(locale, c);
  const href = (enPath: string) => localizePath(enPath, locale);
  const contact = t(CONTACT);
  const es = locale === 'es';

  return (
    <LocaleProvider locale={locale}>
      <div className={sans.className}>
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
            <Link href={href('/')} className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                S
              </span>
              SendCert
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link
                href={href('/faq')}
                className={`hidden text-gray-600 hover:text-gray-900 ${es ? 'md:inline' : 'sm:inline'}`}
              >
                {t({ en: 'FAQ', es: 'Preguntas frecuentes' })}
              </Link>
              <a href={contact} className="hidden text-gray-600 hover:text-gray-900 sm:inline">
                {t({ en: 'Contact', es: 'Contacto' })}
              </a>
              <LanguageSwitcher locale={locale} enPath="/for-organizations" className="hidden sm:inline" />
              <Link
                href={href('/app')}
                className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
              >
                {t({ en: 'Open app', es: 'Abrir app' })}
              </Link>
            </nav>
          </div>
        </header>

        <main>
          {/* Hero */}
          <section className="bg-white">
            <div className="mx-auto max-w-4xl px-5 pb-16 pt-16 text-center sm:px-6 sm:pt-20">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                {t({
                  en: 'For schools, training providers and nonprofits',
                  es: 'Para escuelas, centros de capacitación y ONG',
                })}
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                {t({
                  en: 'Verifiable certificates for every course, training and event you run',
                  es: 'Certificados verificables para cada curso, capacitación y evento que organizas',
                })}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
                {t({
                  en: 'Upload your participant list and each person gets a personalized PDF certificate by email, plus a verification page with your organization as the issuer. No IT project, no per-certificate fees.',
                  es: 'Sube tu lista de participantes y cada persona recibe por correo un certificado PDF personalizado, además de una página de verificación con tu organización como emisora. Sin proyectos de TI y sin costo por certificado.',
                })}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={href('/app')}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
                >
                  {t({ en: 'Start issuing certificates →', es: 'Empieza a emitir certificados →' })}
                </Link>
                <a
                  href={contact}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-7 py-3.5 text-base font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
                >
                  {t({ en: 'Talk to us', es: 'Escríbenos' })}
                </a>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                {t({
                  en: 'Already used by a university, a statewide nonprofit and conference organizers, from the US to the UK and Oman.',
                  es: 'Ya lo usan una universidad, una ONG de alcance estatal y organizadores de congresos, desde Estados Unidos hasta el Reino Unido y Omán.',
                })}
              </p>
            </div>
          </section>

          {/* Who it's for */}
          <section className="border-t border-gray-100 bg-gray-50 py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-5 sm:px-6">
              <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
                {t({
                  en: 'Built for organizations that train people',
                  es: 'Pensado para organizaciones que capacitan a personas',
                })}
              </h2>
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                {AUDIENCES.map((a) => (
                  <div key={a.title.en} className="rounded-2xl border border-gray-200 bg-white p-5">
                    <p className="font-semibold text-gray-900">{t(a.title)}</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(a.text)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="bg-white py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-5 sm:px-6">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                  {t({
                    en: 'Everything a certificate program needs',
                    es: 'Todo lo que necesita un programa de certificación',
                  })}
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  {t({
                    en: 'From the spreadsheet of participants to a credential they can prove.',
                    es: 'Desde la lista de participantes hasta una credencial que pueden demostrar.',
                  })}
                </p>
              </div>
              <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => (
                  <div key={f.title.en}>
                    <p className="flex items-center gap-2 font-semibold text-gray-900">
                      <span className="text-brand-600" aria-hidden>
                        ✓
                      </span>
                      {t(f.title)}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(f.text)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="border-t border-gray-100 bg-gray-50 py-16 sm:py-20">
            <div className="mx-auto max-w-4xl px-5 sm:px-6">
              <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
                {t({ en: 'How it works', es: 'Cómo funciona' })}
              </h2>
              <ol className="mt-10 grid gap-6 sm:grid-cols-3">
                {STEPS.map((step, i) => (
                  <li key={step.title.en} className="rounded-2xl border border-gray-200 bg-white p-6">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                      {i + 1}
                    </span>
                    <p className="mt-4 font-semibold text-gray-900">{t(step.title)}</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">{t(step.text)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Pricing */}
          <section className="bg-white py-16 sm:py-20">
            <div className="mx-auto max-w-3xl px-5 text-center sm:px-6">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                {t({ en: 'Pricing', es: 'Precios' })}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
                {t({
                  en: "Free for up to 300 certificates a month with an account, including verification pages and LinkedIn sharing. Need higher volumes or something specific for your organization? Let's talk.",
                  es: 'Gratis hasta 300 certificados por mes con una cuenta, con páginas de verificación y opción de compartir en LinkedIn incluidas. ¿Necesitas más volumen o algo específico para tu organización? Hablemos.',
                })}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={href('/login')}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
                >
                  {t({ en: 'Create a free account', es: 'Crea una cuenta gratis' })}
                </Link>
                <a
                  href={contact}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
                >
                  hola@sendcert.org
                </a>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="border-t border-gray-100 bg-gray-50 py-16 sm:py-20">
            <div className="mx-auto max-w-3xl px-5 sm:px-6">
              <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
                {t({ en: 'Questions from organizations', es: 'Preguntas de organizaciones' })}
              </h2>
              <dl className="mt-10 space-y-8">
                {FAQ.map((item) => (
                  <div key={item.q.en}>
                    <dt className="font-semibold text-gray-900">{t(item.q)}</dt>
                    <dd className="mt-2 leading-relaxed text-gray-600">{t(item.a)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </main>

        <footer className="border-t border-gray-100 bg-white py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 text-center text-sm text-gray-500 sm:px-6">
            <p className="max-w-md">
              {t({
                en: "Verifiable certificates shouldn't be a premium feature. SendCert makes them free for every teacher, trainer and nonprofit.",
                es: 'Los certificados verificables no deberían ser un lujo. SendCert los hace gratis para cada docente, capacitador y ONG.',
              })}
            </p>
            <p>
              <Link href={href('/')} className="hover:text-gray-900">
                SendCert
              </Link>{' '}
              ·{' '}
              <a href="mailto:hola@sendcert.org" className="hover:text-gray-900">
                hola@sendcert.org
              </a>{' '}
              ·{' '}
              <LanguageSwitcher
                locale={locale}
                enPath="/for-organizations"
                className="!text-gray-500 hover:!text-gray-900"
              />{' '}
              · © {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    </LocaleProvider>
  );
}
