import type { Metadata } from 'next';
import BlogIndex, { BLOG_INDEX_COPY } from '@/components/blog/BlogIndex';
import { pageAlternates } from '@/lib/i18n';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Blog — ${BLOG_INDEX_COPY.title.es}`,
  description: BLOG_INDEX_COPY.description.es,
  openGraph: {
    title: `Blog — ${BLOG_INDEX_COPY.title.es}`,
    description: BLOG_INDEX_COPY.description.es,
    locale: 'es',
  },
  alternates: pageAlternates('/blog', 'es'),
};

export default function BlogIndexPageEs() {
  return <BlogIndex locale="es" />;
}
