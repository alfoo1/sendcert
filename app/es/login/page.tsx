import type { Metadata } from 'next';
import LoginPage from '@/components/pages/LoginPage';
import { pageAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  alternates: pageAlternates('/login', 'es'),
};

export default function Page() {
  return <LoginPage locale="es" />;
}
