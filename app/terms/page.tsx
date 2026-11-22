import type { Metadata } from 'next';
import TermsPage, { TERMS_COPY } from '@/components/pages/TermsPage';
import { pageAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: TERMS_COPY.title.en,
  description: TERMS_COPY.description.en,
  openGraph: {
    type: 'website',
    url: pageAlternates('/terms', 'en').canonical,
    siteName: 'SendCert',
    title: TERMS_COPY.title.en,
    description: TERMS_COPY.description.en,
  },
  alternates: pageAlternates('/terms', 'en'),
};

export default function Page() {
  return <TermsPage locale="en" />;
}
