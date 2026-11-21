import type { Metadata } from 'next';
import './globals.css';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import Analytics from '@/components/Analytics';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const gscVerification = process.env.NEXT_PUBLIC_GSC_VERIFICATION;

// Base metadata with a title template — each page can override the title.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SendCert — Create and email personalized certificates in minutes',
    template: '%s | SendCert',
  },
  description:
    'The tool for teachers and course creators: upload your template, import recipients from CSV or Excel, and send personalized PDF certificates by email in minutes.',
  keywords: [
    'digital certificates',
    'certificate generator',
    'PDF certificates',
    'email certificates',
    'certificate templates',
    'teachers',
    'online courses',
  ],
  authors: [{ name: 'SendCert' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'SendCert',
    title: 'SendCert — Create and email personalized certificates in minutes',
    description:
      'Upload your template, import recipients from CSV or Excel, and send personalized PDF certificates by email.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SendCert — Certificate generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SendCert — Personalized certificates by email',
    description:
      'Upload your template, import recipients, and send PDF certificates in minutes.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  // Google Search Console verification — only emitted when the env var is set.
  // Next renders this as <meta name="google-site-verification" content="..."/>.
  verification: gscVerification ? { google: gscVerification } : undefined,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
        <Analytics />
        <VercelAnalytics />
      </body>
    </html>
  );
}
