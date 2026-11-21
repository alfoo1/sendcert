import type { Metadata } from 'next';
import WizardPage from '@/components/pages/WizardPage';
import { pageAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Crea y envía certificados',
  description:
    'Diseña un certificado, agrega a tus destinatarios y envía a cada uno un PDF personalizado por correo, con su enlace de verificación. Gratis y sin registro.',
  alternates: pageAlternates('/app', 'es'),
};

export default function AppPageEs() {
  return <WizardPage locale="es" />;
}
