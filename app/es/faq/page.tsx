import type { Metadata } from 'next';
import FaqPage from '@/components/pages/FaqPage';
import { pageAlternates } from '@/lib/i18n';

const TITLE = 'Preguntas frecuentes sobre SendCert';
const DESCRIPTION =
  'Todo lo que necesitas saber para crear y enviar certificados con SendCert: límites gratuitos, plantillas, verificación, LinkedIn y privacidad.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'es_LA',
    url: pageAlternates('/faq', 'es').canonical,
    siteName: 'SendCert',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SendCert: generador de certificados' }],
  },
  alternates: pageAlternates('/faq', 'es'),
};

export default function Page() {
  return <FaqPage locale="es" />;
}
