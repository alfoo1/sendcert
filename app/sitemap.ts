import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Sitemap con rutas estáticas — extender cuando se añadan nuevas páginas/posts
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/app`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/como-crear-certificados-digitales`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/blog/enviar-certificados-por-email`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
