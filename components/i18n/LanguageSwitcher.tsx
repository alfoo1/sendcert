import Link from 'next/link';
import { localizePath, type Locale } from '@/lib/i18n';

/**
 * "English · Español" link pair pointing at the same page in the other
 * language. `enPath` is the canonical English path of the current page.
 */
export default function LanguageSwitcher({
  locale,
  enPath,
  className = '',
}: {
  locale: Locale;
  enPath: string;
  className?: string;
}) {
  const other: Locale = locale === 'en' ? 'es' : 'en';
  return (
    <Link
      href={localizePath(enPath, other)}
      hrefLang={other}
      className={`text-gray-600 hover:text-gray-900 ${className}`}
      aria-label={other === 'es' ? 'Ver en español' : 'View in English'}
    >
      {other === 'es' ? 'Español' : 'English'}
    </Link>
  );
}
