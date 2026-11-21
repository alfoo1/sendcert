import Link from 'next/link';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import CTA from '@/components/CTA';
import TemplateGallery from '@/components/landing/TemplateGallery';
import FreePlans from '@/components/landing/FreePlans';
import FaqTeaser from '@/components/landing/FaqTeaser';
import VerifiedSection from '@/components/landing/VerifiedSection';
import { sans } from '@/components/landing/fonts';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { localizePath, tx, type Locale } from '@/lib/i18n';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Structured data JSON-LD: describes SendCert as SoftwareApplication for SEO,
// in the language of the page.
function jsonLd(locale: Locale) {
  const offers = { '@type': 'Offer', price: '0', priceCurrency: 'USD' };
  if (locale === 'es') {
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'SendCert',
      url: `${siteUrl.replace(/\/$/, '')}${localizePath('/', 'es')}`,
      description:
        'Crea certificados PDF personalizados a partir de una plantilla y envía uno por correo a cada destinatario, cada uno con su propio enlace de verificación. Gratis y sin registro.',
      inLanguage: 'es',
      applicationCategory: 'EducationApplication',
      operatingSystem: 'Web',
      offers,
    };
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SendCert',
    url: siteUrl,
    description:
      'Create personalized PDF certificates from a template and email one to each recipient, each with its own verification link. Free, no sign-up.',
    applicationCategory: 'EducationApplication',
    operatingSystem: 'Web',
    offers,
  };
}

export default function LandingPage({ locale }: { locale: Locale }) {
  const es = locale === 'es';
  const href = (enPath: string) => localizePath(enPath, locale);
  // Spanish labels are longer, so the secondary header links appear one
  // breakpoint later to keep the bar on a single line.
  const orgsHeaderClass = es ? 'lg:inline' : 'md:inline';
  const faqHeaderClass = es ? 'md:inline' : 'sm:inline';

  return (
    <LocaleProvider locale={locale}>
      <div className={sans.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(locale)) }}
        />

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
                href={href('/for-organizations')}
                className={`hidden text-gray-600 hover:text-gray-900 ${orgsHeaderClass}`}
              >
                {tx(locale, { en: 'For organizations', es: 'Para organizaciones' })}
              </Link>
              <Link href={href('/blog')} className="hidden text-gray-600 hover:text-gray-900 sm:inline">
                Blog
              </Link>
              <Link
                href={href('/faq')}
                className={`hidden text-gray-600 hover:text-gray-900 ${faqHeaderClass}`}
              >
                {tx(locale, { en: 'FAQ', es: 'Preguntas frecuentes' })}
              </Link>
              <LanguageSwitcher locale={locale} enPath="/" className="hidden sm:inline" />
              <Link href={href('/login')} className="text-gray-600 hover:text-gray-900">
                {tx(locale, { en: 'Sign in', es: 'Iniciar sesión' })}
              </Link>
              <Link
                href={href('/app')}
                className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
              >
                {tx(locale, { en: 'Open app', es: 'Abrir app' })}
              </Link>
            </nav>
          </div>
        </header>

        <main>
          <Hero locale={locale} />
          <TemplateGallery locale={locale} />
          <VerifiedSection locale={locale} />
          <HowItWorks locale={locale} />
          <FreePlans locale={locale} />
          <FaqTeaser locale={locale} />
          <CTA locale={locale} />
        </main>

        <footer className="border-t border-gray-100 bg-gray-50 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 text-center text-sm text-gray-500 sm:px-6">
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href={href('/app')} className="hover:text-gray-900">
                App
              </Link>
              <Link href={href('/for-organizations')} className="hover:text-gray-900">
                {tx(locale, { en: 'For organizations', es: 'Para organizaciones' })}
              </Link>
              <Link href={href('/blog')} className="hover:text-gray-900">
                Blog
              </Link>
              <Link href={href('/faq')} className="hover:text-gray-900">
                {tx(locale, { en: 'FAQ', es: 'Preguntas frecuentes' })}
              </Link>
              <Link href={href('/login')} className="hover:text-gray-900">
                {tx(locale, { en: 'Sign in', es: 'Iniciar sesión' })}
              </Link>
              <LanguageSwitcher locale={locale} enPath="/" className="!text-gray-500 hover:!text-gray-900" />
            </nav>
            <p>
              {tx(locale, {
                en: "🔒 We never store your recipients' email addresses from guest sends. Each verification page shows only the name, certificate, issuer and date.",
                es: '🔒 Nunca guardamos las direcciones de correo de tus destinatarios cuando envías como invitado. Cada página de verificación muestra solo el nombre, el certificado, quién lo emitió y la fecha.',
              })}
            </p>
            <p>© {new Date().getFullYear()} SendCert</p>
          </div>
        </footer>
      </div>
    </LocaleProvider>
  );
}
