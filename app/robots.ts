import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// robots.txt autogenerado — impide indexar API routes
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/mcp'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
