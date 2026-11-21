'use client';

import { createContext, useCallback, useContext, useEffect } from 'react';
import { LOCALE_TAG, tx, type Locale, type Tx } from '@/lib/i18n';

const LocaleContext = createContext<Locale>('en');

/**
 * Wrap a page's client components so they can read the locale with
 * useLocale() / useTx(). Pages without a provider default to English.
 * Also sets <html lang>, since the root layout is shared by all locales.
 */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = LOCALE_TAG[locale];
  }, [locale]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** const t = useTx(); t({ en: 'Next', es: 'Siguiente' }) */
export function useTx(): (t: Tx) => string {
  const locale = useLocale();
  return useCallback((t: Tx) => tx(locale, t), [locale]);
}
