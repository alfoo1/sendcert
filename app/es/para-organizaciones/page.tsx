import type { Metadata } from 'next';
import OrganizationsPage, { ORGS_DESCRIPTION, ORGS_TITLE } from '@/components/pages/OrganizationsPage';
import { pageAlternates } from '@/lib/i18n';

const alternates = pageAlternates('/for-organizations', 'es');

export const metadata: Metadata = {
  title: `SendCert para organizaciones · ${ORGS_TITLE.es}`,
  description: ORGS_DESCRIPTION.es,
  alternates,
  openGraph: {
    type: 'website',
    locale: 'es_LA',
    url: alternates.canonical,
    siteName: 'SendCert',
    title: ORGS_TITLE.es,
    description: ORGS_DESCRIPTION.es,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SendCert: generador de certificados' }],
  },
};

export default function Page() {
  return <OrganizationsPage locale="es" />;
}
