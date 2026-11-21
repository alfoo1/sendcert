import Link from 'next/link';
import { getPublishedPosts } from '@/lib/blog';
import { LOCALE_TAG, localizePath, tx, type Locale } from '@/lib/i18n';

export const BLOG_INDEX_COPY = {
  title: { en: 'Certificate Tips & Guides', es: 'Guías y consejos sobre certificados' },
  description: {
    en: 'Free guides on creating and sending certificates for online courses, teachers, and educators.',
    es: 'Guías gratis para crear y enviar certificados de cursos, capacitaciones y eventos.',
  },
};

/**
 * Formats an ISO date as a publication date. Locale is pinned so server and
 * client render the same string (hydration safety).
 */
export function formatPostDate(isoDate: string, locale: Locale): string {
  return new Date(isoDate).toLocaleDateString(LOCALE_TAG[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogIndex({ locale }: { locale: Locale }) {
  const posts = await getPublishedPosts(new Date(), locale);
  const base = localizePath('/blog', locale);

  return (
    <>
      <header className="not-prose mb-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Blog</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {tx(locale, BLOG_INDEX_COPY.title)}
        </h1>
        <p className="mt-4 text-lg text-gray-600">{tx(locale, BLOG_INDEX_COPY.description)}</p>
      </header>

      {posts.length === 0 ? (
        <p className="text-gray-500">
          {tx(locale, { en: 'No articles yet. Check back soon.', es: 'Todavía no hay artículos. Vuelve pronto.' })}
        </p>
      ) : (
        <ul className="not-prose space-y-8">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="rounded-xl border border-gray-200 bg-white p-6 transition hover:border-brand-300 hover:shadow-sm"
            >
              <Link href={`${base}/${post.slug}`} className="block">
                <h2 className="text-xl font-semibold text-gray-900 hover:text-brand-700">{post.title}</h2>
                <p className="mt-2 text-sm text-gray-600">{post.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                  <time dateTime={post.publishDate}>{formatPostDate(post.publishDate, locale)}</time>
                  <span aria-hidden>·</span>
                  <span>
                    {post.readingMinutes} {tx(locale, { en: 'min read', es: 'min de lectura' })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
