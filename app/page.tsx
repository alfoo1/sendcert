import type { Metadata } from 'next';
import LandingPage from '@/components/pages/LandingPage';
import { pageAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  alternates: pageAlternates('/', 'en'),
};

export default function Page() {
  return <LandingPage locale="en" />;
}
