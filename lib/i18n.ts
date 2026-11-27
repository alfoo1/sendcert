// Minimal i18n for SendCert. English lives at the root (/app, /faq, ...);
// Spanish lives under /es (/es/app, /es/faq, ...). Translations are written
// inline next to the UI they belong to: tx(locale, { en: '...', es: '...' }).
// Spanish is neutral Latin American Spanish with "tú".

export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** A string in every supported language. */
export type Tx = { en: string; es: string };

export function tx(locale: Locale, t: Tx): string {
  return t[locale] ?? t.en;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** BCP 47 tag for dates, numbers and <html lang>. */
export const LOCALE_TAG: Record<Locale, string> = { en: 'en-US', es: 'es' };

// English path → Spanish path, for pages whose slug is translated.
const ES_SLUGS: Record<string, string> = {
  '/for-organizations': '/para-organizaciones',
  '/ai-assistants': '/asistentes-ia',
  '/privacy': '/privacidad',
  '/terms': '/terminos',
  '/dashboard': '/panel',
  '/events': '/eventos',
  '/events/new': '/eventos/nuevo',
};

/**
 * Turns a canonical English path ('/', '/app', '/faq', '/for-organizations',
 * '/blog', '/login') into its path in `locale`.
 */
export function localizePath(enPath: string, locale: Locale): string {
  if (locale === 'en') return enPath;
  if (enPath === '/') return '/es';
  if (ES_SLUGS[enPath]) return `/es${ES_SLUGS[enPath]}`;
  // Sub-paths of a translated section keep their tail: /events/<id> → /es/eventos/<id>.
  const prefix = Object.keys(ES_SLUGS)
    .filter((key) => enPath.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (prefix) return `/es${ES_SLUGS[prefix]}${enPath.slice(prefix.length)}`;
  return `/es${enPath}`;
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/**
 * Metadata alternates for a page that exists in every language: canonical
 * for the current locale plus hreflang links (and x-default → English).
 */
export function pageAlternates(enPath: string, locale: Locale) {
  return {
    canonical: `${SITE_URL}${localizePath(enPath, locale)}`,
    languages: {
      en: `${SITE_URL}${localizePath(enPath, 'en')}`,
      es: `${SITE_URL}${localizePath(enPath, 'es')}`,
      'x-default': `${SITE_URL}${localizePath(enPath, 'en')}`,
    },
  };
}
