import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { getPublishedPostBySlug, type BlogPost } from '@/lib/blog';
import { localizePath, tx, type Locale } from '@/lib/i18n';
import { formatPostDate } from './BlogIndex';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

function postUrl(slug: string, locale: Locale): string {
  return `${siteUrl}${localizePath('/blog', locale)}/${slug}`;
}

export async function blogPostMetadata(slug: string, locale: Locale): Promise<Metadata> {
  const post = await getPublishedPostBySlug(slug, new Date(), locale);
  if (!post) {
    return { title: tx(locale, { en: 'Article not found', es: 'Artículo no encontrado' }) };
  }
  const url = postUrl(post.slug, locale);
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
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
  };
}

/** Article schema.org JSON-LD — helps search engines render rich results. */
function buildJsonLd(post: BlogPost, locale: Locale): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    inLanguage: locale,
    datePublished: post.publishDate,
    dateModified: post.publishDate,
    author: { '@type': 'Organization', name: 'SendCert' },
    publisher: { '@type': 'Organization', name: 'SendCert', url: siteUrl },
    mainEntityOfPage: postUrl(post.slug, locale),
  };
}

export default async function BlogPostView({ slug, locale }: { slug: string; locale: Locale }) {
  const post = await getPublishedPostBySlug(slug, new Date(), locale);
  if (!post) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(post, locale)) }}
      />

      <header className="not-prose mb-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {tx(locale, { en: 'Guide', es: 'Guía' })}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">{post.title}</h1>
        <p className="mt-4 text-lg text-gray-600">{post.description}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
          <time dateTime={post.publishDate}>{formatPostDate(post.publishDate, locale)}</time>
          <span aria-hidden>·</span>
          <span>
            {post.readingMinutes} {tx(locale, { en: 'min read', es: 'min de lectura' })}
          </span>
        </div>
      </header>

      <MDXRemote source={post.content} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />

      <div className="not-prose mt-16 rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-lg font-semibold text-gray-900">
          {tx(locale, {
            en: 'Ready to send your own certificates?',
            es: '¿Listo para enviar tus propios certificados?',
          })}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          {tx(locale, {
            en: 'Free: 100 certificates a month without an account, 300 with a free one.',
            es: 'Gratis: 100 certificados al mes sin cuenta, 300 con una cuenta gratuita.',
          })}
        </p>
        <Link
          href={localizePath('/app', locale)}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
        >
          {tx(locale, {
            en: 'Create your first certificate free →',
            es: 'Crea tu primer certificado gratis →',
          })}
        </Link>
      </div>

      <div className="not-prose mt-10 text-sm">
        <Link href={localizePath('/blog', locale)} className="text-gray-500 hover:text-gray-900">
          {tx(locale, { en: '← Back to all articles', es: '← Ver todos los artículos' })}
        </Link>
      </div>
    </>
  );
}
