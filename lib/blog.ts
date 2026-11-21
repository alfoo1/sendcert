import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { Locale } from './i18n';

// Frontmatter every article must declare.
export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  publishDate: string; // ISO date
  tags?: string[];
};

export type BlogPost = BlogPostMeta & {
  content: string; // Raw MDX body (no frontmatter)
  readingMinutes: number;
};

// English posts live in content/blog, Spanish ones in content/blog/es.
function contentDir(locale: Locale): string {
  const base = path.join(process.cwd(), 'content', 'blog');
  return locale === 'en' ? base : path.join(base, locale);
}

/**
 * Word-based reading-time estimate. 200 wpm is the common rule of thumb for
 * online reading. We split on whitespace which is good enough for English
 * marketing copy — no need to bring in a heavier library for an MVP.
 */
function estimateReadingMinutes(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, '') // strip fenced code blocks
    .replace(/[#*`>[\]()_-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

async function readPostFile(dir: string, filename: string): Promise<BlogPost | null> {
  if (!filename.endsWith('.mdx')) return null;
  const filePath = path.join(dir, filename);
  const raw = await readFile(filePath, 'utf8');
  const { data, content } = matter(raw);

  // Defensive: skip files missing required frontmatter rather than crashing
  // the whole index render.
  if (!data.slug || !data.title || !data.description || !data.publishDate) {
    console.warn(`Skipping ${filename}: missing required frontmatter`);
    return null;
  }

  // YAML auto-parses unquoted dates (e.g. `publishDate: 2026-04-20`) into JS
  // Date objects. `String(date)` then yields a `Mon Apr 20 2026...` form that
  // breaks our ISO-based string comparison. Normalize to a true ISO string.
  const publishDate =
    data.publishDate instanceof Date
      ? data.publishDate.toISOString()
      : String(data.publishDate);

  return {
    slug: String(data.slug),
    title: String(data.title),
    description: String(data.description),
    publishDate,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    content,
    readingMinutes: estimateReadingMinutes(content),
  };
}

/**
 * Returns EVERY post (published or scheduled). Used by sitemaps / admin views.
 */
export async function getAllPosts(locale: Locale = 'en'): Promise<BlogPost[]> {
  const dir = contentDir(locale);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    // Fresh checkout without content dir yet — treat as empty.
    return [];
  }
  const posts = await Promise.all(entries.map((name) => readPostFile(dir, name)));
  return posts
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => b.publishDate.localeCompare(a.publishDate));
}

/**
 * Returns only posts whose publishDate is on or before "now". This is the
 * function the public-facing blog index calls — future-dated articles stay
 * invisible until their scheduled day.
 */
export async function getPublishedPosts(
  now: Date = new Date(),
  locale: Locale = 'en',
): Promise<BlogPost[]> {
  const all = await getAllPosts(locale);
  const cutoff = now.toISOString();
  return all.filter((p) => p.publishDate <= cutoff);
}

/**
 * Fetches a single post by slug, but only if it's already published — keeps
 * future posts from being reachable via direct URL.
 */
export async function getPublishedPostBySlug(
  slug: string,
  now: Date = new Date(),
  locale: Locale = 'en',
): Promise<BlogPost | null> {
  const all = await getPublishedPosts(now, locale);
  return all.find((p) => p.slug === slug) ?? null;
}

/**
 * Slugs list used by `generateStaticParams` so Next can pre-render each post
 * at build time. We still mark pages with `revalidate` so ISR can reveal
 * scheduled posts without a redeploy.
 */
export async function getPublishedSlugs(locale: Locale = 'en'): Promise<string[]> {
  const all = await getPublishedPosts(new Date(), locale);
  return all.map((p) => p.slug);
}
