import type { Metadata } from 'next';
import PrivacyPage, { PRIVACY_COPY } from '@/components/pages/PrivacyPage';
import { pageAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: PRIVACY_COPY.title.en,
  description: PRIVACY_COPY.description.en,
  openGraph: {
    type: 'website',
    url: pageAlternates('/privacy', 'en').canonical,
    siteName: 'SendCert',
    title: PRIVACY_COPY.title.en,
    description: PRIVACY_COPY.description.en,
  },
  alternates: pageAlternates('/privacy', 'en'),
};

export default function Page() {
  return <PrivacyPage locale="en" />;
}
