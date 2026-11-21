import type { Metadata } from 'next';
import BlogPostView, { blogPostMetadata } from '@/components/blog/BlogPostView';
import { getPublishedSlugs } from '@/lib/blog';

export const revalidate = 86400;

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs('es');
  return slugs.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return blogPostMetadata(params.slug, 'es');
}

export default function BlogPostPageEs({ params }: Props) {
  return <BlogPostView slug={params.slug} locale="es" />;
}
