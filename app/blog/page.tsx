import type { Metadata } from 'next';
import BlogIndex, { BLOG_INDEX_COPY } from '@/components/blog/BlogIndex';
import { pageAlternates } from '@/lib/i18n';

// Revalidate the blog index once a day so scheduled articles go live on their
// publishDate without a redeploy.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Blog — ${BLOG_INDEX_COPY.title.en}`,
  description: BLOG_INDEX_COPY.description.en,
  openGraph: {
    title: `Blog — ${BLOG_INDEX_COPY.title.en}`,
    description: BLOG_INDEX_COPY.description.en,
  },
  alternates: pageAlternates('/blog', 'en'),
};

export default function BlogIndexPage() {
  return <BlogIndex locale="en" />;
}
