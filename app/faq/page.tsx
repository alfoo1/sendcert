import type { Metadata } from 'next';
import FaqPage from '@/components/pages/FaqPage';
import { pageAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'SendCert FAQ — Frequently Asked Questions',
  description:
    'Everything you need to know about creating and sending certificates with SendCert.',
  openGraph: {
    title: 'SendCert FAQ — Frequently Asked Questions',
    description:
      'Everything you need to know about creating and sending certificates with SendCert.',
  },
  alternates: pageAlternates('/faq', 'en'),
};

export default function Page() {
  return <FaqPage locale="en" />;
}
