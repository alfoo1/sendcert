import type { Metadata } from 'next';
import LandingPage from '@/components/pages/LandingPage';
import { pageAlternates } from '@/lib/i18n';

const TITLE = 'SendCert: crea y envía certificados personalizados por correo en minutos';
const DESCRIPTION =
  'Gratis para docentes, capacitadores y ONG: elige una plantilla, agrega a tus destinatarios y envía certificados PDF personalizados por correo, cada uno con su propio enlace de verificación. Sin registro.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: pageAlternates('/', 'es'),
  openGraph: {
    type: 'website',
    locale: 'es_LA',
    url: pageAlternates('/', 'es').canonical,
    siteName: 'SendCert',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SendCert: generador de certificados' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SendCert: certificados personalizados por correo',
    description: 'Elige una plantilla, agrega a tus destinatarios y envía certificados PDF en minutos. Gratis.',
    images: ['/og-image.png'],
  },
};

export default function Page() {
  return <LandingPage locale="es" />;
}
