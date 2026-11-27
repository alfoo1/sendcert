import Link from 'next/link';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { LegalLinks } from '@/components/pages/DocShell';
import { localizePath, tx, type Locale } from '@/lib/i18n';

/** Header and footer for the signed-in pages (dashboard and send detail). */
export default function AccountShell({
  locale,
  enPath,
  children,
}: {
  locale: Locale;
  // English path of this page, for the language switcher.
  enPath: string;
  children: React.ReactNode;
}) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  return (
    <LocaleProvider locale={locale}>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <Link href={localizePath('/', locale)} className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">S</span>
            SendCert
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href={localizePath('/dashboard', locale)} className="hidden text-gray-600 hover:text-gray-900 sm:inline">
              {t('My sends', 'Mis envíos')}
            </Link>
            <LanguageSwitcher locale={locale} enPath={enPath} />
            <Link
              href={localizePath('/app', locale)}
              className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
            >
              {t('Send certificates', 'Enviar certificados')}
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-gray-500 hover:text-gray-900">
                {t('Sign out', 'Cerrar sesión')}
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      <footer className="border-t border-gray-100 bg-gray-50 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 text-center text-sm text-gray-500">
          <LegalLinks locale={locale} />
          <p>© {new Date().getFullYear()} SendCert</p>
        </div>
      </footer>
    </LocaleProvider>
  );
}
