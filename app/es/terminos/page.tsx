import type { Metadata } from 'next';
import TermsPage, { TERMS_COPY } from '@/components/pages/TermsPage';
import { pageAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: TERMS_COPY.title.es,
  description: TERMS_COPY.description.es,
  openGraph: {
    type: 'website',
    locale: 'es_LA',
    url: pageAlternates('/terms', 'es').canonical,
    siteName: 'SendCert',
    title: TERMS_COPY.title.es,
    description: TERMS_COPY.description.es,
  },
  alternates: pageAlternates('/terms', 'es'),
};

export default function Page() {
  return <TermsPage locale="es" />;
}
