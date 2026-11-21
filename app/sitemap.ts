import type { MetadataRoute } from 'next';
import { getPublishedPosts } from '@/lib/blog';
import { localizePath, LOCALES, type Locale } from '@/lib/i18n';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

// The sitemap re-renders on the same ISR schedule as the blog index.
export const revalidate = 86400;

type StaticPage = {
  enPath: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
};

const STATIC_PAGES: StaticPage[] = [
  { enPath: '/', changeFrequency: 'weekly', priority: 1.0 },
  { enPath: '/app', changeFrequency: 'monthly', priority: 0.8 },
  { enPath: '/for-organizations', changeFrequency: 'monthly', priority: 0.8 },
  { enPath: '/blog', changeFrequency: 'weekly', priority: 0.7 },
  { enPath: '/faq', changeFrequency: 'monthly', priority: 0.6 },
];

function url(enPath: string, locale: Locale): string {
  const p = localizePath(enPath, locale);
  return `${siteUrl}${p === '/' ? '/' : p}`;
}

/**
 * Sitemap: every static page in each language (with hreflang alternates) plus
 * the currently published posts of each language. Scheduled posts are left
 * out until their publishDate.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: url(page.enPath, locale),
      lastModified: now,
      changeFrequency: page.changeFrequency,
      // The Spanish pages sit slightly below their English originals.
      priority: locale === 'en' ? page.priority : Math.round(page.priority * 0.9 * 10) / 10,
      alternates: {
        languages: {
          en: url(page.enPath, 'en'),
          es: url(page.enPath, 'es'),
          'x-default': url(page.enPath, 'en'),
        },
      },
    })),
  );

  const postEntries = await Promise.all(
    LOCALES.map(async (locale) => {
      const posts = await getPublishedPosts(now, locale);
      const base = localizePath('/blog', locale);
      return posts.map((post) => ({
        url: `${siteUrl}${base}/${post.slug}`,
        lastModified: new Date(post.publishDate),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
    }),
  );

  return [...staticEntries, ...postEntries.flat()];
}
