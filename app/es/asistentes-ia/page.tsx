import type { Metadata } from 'next';
import AiAssistantsPage, { AI_PAGE_COPY } from '@/components/pages/AiAssistantsPage';
import { pageAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: AI_PAGE_COPY.title.es,
  description: AI_PAGE_COPY.description.es,
  openGraph: {
    type: 'website',
    locale: 'es_LA',
    url: pageAlternates('/ai-assistants', 'es').canonical,
    siteName: 'SendCert',
    title: AI_PAGE_COPY.title.es,
    description: AI_PAGE_COPY.description.es,
  },
  alternates: pageAlternates('/ai-assistants', 'es'),
};

export default function Page() {
  return <AiAssistantsPage locale="es" />;
}
