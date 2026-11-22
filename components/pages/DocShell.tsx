import Link from 'next/link';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { localizePath, tx, type Locale } from '@/lib/i18n';

/** Footer links shared by the guide and legal pages. */
export function LegalLinks({ locale, className = '' }: { locale: Locale; className?: string }) {
  return (
    <nav className={`flex flex-wrap justify-center gap-x-6 gap-y-2 ${className}`}>
      <Link href={localizePath('/ai-assistants', locale)} className="hover:text-gray-900">
        {tx(locale, { en: 'AI assistants', es: 'Asistentes de IA' })}
      </Link>
      <Link href={localizePath('/privacy', locale)} className="hover:text-gray-900">
        {tx(locale, { en: 'Privacy', es: 'Privacidad' })}
      </Link>
      <Link href={localizePath('/terms', locale)} className="hover:text-gray-900">
        {tx(locale, { en: 'Terms', es: 'Términos' })}
      </Link>
      <a href="mailto:hola@sendcert.org" className="hover:text-gray-900">
        hola@sendcert.org
      </a>
    </nav>
  );
}

/** Chrome for text pages (AI assistants guide, privacy policy, terms). */
export default function DocShell({
  locale,
  enPath,
  children,
}: {
  locale: Locale;
  enPath: string;
  children: React.ReactNode;
}) {
  return (
    <LocaleProvider locale={locale}>
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href={localizePath('/', locale)} className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">S</span>
            SendCert
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <LanguageSwitcher locale={locale} enPath={enPath} />
            <Link
              href={localizePath('/app', locale)}
              className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
            >
              {tx(locale, { en: 'Open app', es: 'Abrir app' })}
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <article className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-brand-600 prose-code:before:content-none prose-code:after:content-none">
          {children}
        </article>
      </main>
      <footer className="border-t border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center text-sm text-gray-500">
          <LegalLinks locale={locale} />
          <p>© {new Date().getFullYear()} SendCert</p>
        </div>
      </footer>
    </LocaleProvider>
  );
}
