import type { Metadata } from 'next';
import WizardPage from '@/components/pages/WizardPage';
import { pageAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Create and send certificates',
  description:
    'Design a certificate, add your recipients and email a personalized PDF to each one, with a verification link. Free, no sign-up.',
  alternates: pageAlternates('/app', 'en'),
};

export default function AppPage() {
  return <WizardPage locale="en" />;
}
