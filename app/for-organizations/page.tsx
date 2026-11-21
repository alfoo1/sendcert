import type { Metadata } from 'next';
import OrganizationsPage, { ORGS_DESCRIPTION, ORGS_TITLE } from '@/components/pages/OrganizationsPage';
import { pageAlternates } from '@/lib/i18n';

const alternates = pageAlternates('/for-organizations', 'en');

export const metadata: Metadata = {
  title: `SendCert for organizations · ${ORGS_TITLE.en}`,
  description: ORGS_DESCRIPTION.en,
  alternates,
  openGraph: { title: ORGS_TITLE.en, description: ORGS_DESCRIPTION.en, url: alternates.canonical },
};

export default function Page() {
  return <OrganizationsPage locale="en" />;
}
