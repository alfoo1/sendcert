import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import {
  getPublishedPostBySlug,
  getPublishedSlugs,
  type BlogPost,
} from '@/lib/blog';

// ISR: each post page is re-rendered at most once every 24 hours. Combined
// with `generateStaticParams` covering currently-published slugs, this lets
// scheduled posts go live on their publishDate without a redeploy.
export const revalidate = 86400;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

type Props = {
  params: { slug: string };
};

/**
 * Pre-renders every currently-published post at build time. Future posts
 * fall through to on-demand ISR on their first request after publishDate.
 */
export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPostBySlug(params.slug);
  if (!post) {
    return { title: 'Article not found' };
  }
  const url = `${siteUrl}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.publishDate,
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

/** Article schema.org JSON-LD — helps search engines render rich results. */
function buildJsonLd(post: BlogPost): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishDate,
    dateModified: post.publishDate,
    author: { '@type': 'Organization', name: 'SendCert' },
    publisher: {
      '@type': 'Organization',
      name: 'SendCert',
      url: siteUrl,
    },
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
  };
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPublishedPostBySlug(params.slug);
  if (!post) notFound();

  const jsonLd = buildJsonLd(post);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="not-prose mb-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Guide
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-gray-600">{post.description}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
          <time dateTime={post.publishDate}>{formatDate(post.publishDate)}</time>
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
      </header>

      {/* MDX content is rendered in a React Server Component via the /rsc
          entry point — no client runtime shipped for static articles. */}
      <MDXRemote
        source={post.content}
        options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
      />

      <div className="not-prose mt-16 rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-lg font-semibold text-gray-900">
          Ready to send your own certificates?
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Free: 30 certificates a month without an account, 150 with a free one.
        </p>
        <Link
          href="/app"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
        >
          Create your first certificate free →
        </Link>
      </div>

      <div className="not-prose mt-10 text-sm">
        <Link href="/blog" className="text-gray-500 hover:text-gray-900">
          ← Back to all articles
        </Link>
      </div>
    </>
  );
}
