import type { Metadata } from 'next';
import PrivacyPage, { PRIVACY_COPY } from '@/components/pages/PrivacyPage';
import { pageAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: PRIVACY_COPY.title.es,
  description: PRIVACY_COPY.description.es,
  openGraph: {
    type: 'website',
    locale: 'es_LA',
    url: pageAlternates('/privacy', 'es').canonical,
    siteName: 'SendCert',
    title: PRIVACY_COPY.title.es,
    description: PRIVACY_COPY.description.es,
  },
  alternates: pageAlternates('/privacy', 'es'),
};

export default function Page() {
  return <PrivacyPage locale="es" />;
}
