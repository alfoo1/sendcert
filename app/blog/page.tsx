import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPosts } from '@/lib/blog';

// Revalidate the blog index once a day. Combined with ISR on the individual
// post pages, this means newly scheduled articles go live automatically on
// their publishDate without a redeploy.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Blog — Certificate Tips & Guides',
  description:
    'Free guides on creating and sending certificates for online courses, teachers, and educators.',
  openGraph: {
    title: 'Blog — Certificate Tips & Guides',
    description:
      'Free guides on creating and sending certificates for online courses, teachers, and educators.',
  },
  alternates: {
    canonical: '/blog',
  },
};

/**
 * Formats an ISO date string as a human-readable publication date
 * (e.g. "May 1, 2026"). Locale is pinned so server and client render the
 * same string (hydration safety).
 */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <>
      <header className="not-prose mb-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Blog
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Certificate Tips &amp; Guides
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Free guides on creating and sending certificates for online courses,
          teachers, and educators.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-gray-500">No articles yet — check back soon.</p>
      ) : (
        <ul className="not-prose space-y-8">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="rounded-xl border border-gray-200 bg-white p-6 transition hover:border-brand-300 hover:shadow-sm"
            >
              <Link href={`/blog/${post.slug}`} className="block">
                <h2 className="text-xl font-semibold text-gray-900 hover:text-brand-700">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm text-gray-600">{post.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                  <time dateTime={post.publishDate}>{formatDate(post.publishDate)}</time>
                  <span aria-hidden>·</span>
                  <span>{post.readingMinutes} min read</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
