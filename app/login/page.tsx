import type { Metadata } from 'next';
import LoginPage from '@/components/pages/LoginPage';
import { pageAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Sign in',
  alternates: pageAlternates('/login', 'en'),
};

export default function Page() {
  return <LoginPage locale="en" />;
}
