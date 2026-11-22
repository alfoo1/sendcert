import type { Metadata } from 'next';
import AiAssistantsPage, { AI_PAGE_COPY } from '@/components/pages/AiAssistantsPage';
import { pageAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: AI_PAGE_COPY.title.en,
  description: AI_PAGE_COPY.description.en,
  openGraph: {
    type: 'website',
    url: pageAlternates('/ai-assistants', 'en').canonical,
    siteName: 'SendCert',
    title: AI_PAGE_COPY.title.en,
    description: AI_PAGE_COPY.description.en,
  },
  alternates: pageAlternates('/ai-assistants', 'en'),
};

export default function Page() {
  return <AiAssistantsPage locale="en" />;
}
