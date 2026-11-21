import type { Metadata } from 'next';
import BlogPostView, { blogPostMetadata } from '@/components/blog/BlogPostView';
import { getPublishedSlugs } from '@/lib/blog';

// ISR: re-rendered at most once a day, so scheduled posts go live on their
// publishDate without a redeploy.
export const revalidate = 86400;

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs('en');
  return slugs.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return blogPostMetadata(params.slug, 'en');
}

export default function BlogPostPage({ params }: Props) {
  return <BlogPostView slug={params.slug} locale="en" />;
}
