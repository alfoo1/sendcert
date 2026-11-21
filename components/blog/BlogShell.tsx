import Link from 'next/link';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { localizePath, tx, type Locale } from '@/lib/i18n';

// Shared blog chrome (top nav + readable content container) for every locale.
export default function BlogShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <LocaleProvider locale={locale}>
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href={localizePath('/', locale)} className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              S
            </span>
            SendCert
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href={localizePath('/', locale)} className="hidden text-gray-600 hover:text-gray-900 sm:inline">
              {tx(locale, { en: 'Home', es: 'Inicio' })}
            </Link>
            <LanguageSwitcher locale={locale} enPath="/blog" />
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
        <article className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-brand-600">
          {children}
        </article>
      </main>
      <footer className="border-t border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SendCert
        </div>
      </footer>
    </LocaleProvider>
  );
}
