import Link from 'next/link';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import CTA from '@/components/CTA';
import TemplateGallery from '@/components/landing/TemplateGallery';
import FreePlans from '@/components/landing/FreePlans';
import FaqTeaser from '@/components/landing/FaqTeaser';
import VerifiedSection from '@/components/landing/VerifiedSection';
import { sans } from '@/components/landing/fonts';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Structured data JSON-LD: describes SendCert as SoftwareApplication for SEO.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SendCert',
  url: siteUrl,
  description:
    'Create personalized PDF certificates from a template and email one to each recipient, each with its own verification link. Free, no sign-up.',
  applicationCategory: 'EducationApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function LandingPage() {
  return (
    <div className={sans.className}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              S
            </span>
            SendCert
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/for-organizations" className="hidden text-gray-600 hover:text-gray-900 md:inline">
              For organizations
            </Link>
            <Link href="/blog" className="hidden text-gray-600 hover:text-gray-900 sm:inline">
              Blog
            </Link>
            <Link href="/faq" className="hidden text-gray-600 hover:text-gray-900 sm:inline">
              FAQ
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
            <Link
              href="/app"
              className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
            >
              Open app
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <Hero />
        <TemplateGallery />
        <VerifiedSection />
        <HowItWorks />
        <FreePlans />
        <FaqTeaser />
        <CTA />
      </main>

      <footer className="border-t border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 text-center text-sm text-gray-500 sm:px-6">
          <nav className="flex gap-6">
            <Link href="/app" className="hover:text-gray-900">
              App
            </Link>
            <Link href="/for-organizations" className="hover:text-gray-900">
              For organizations
            </Link>
            <Link href="/blog" className="hover:text-gray-900">
              Blog
            </Link>
            <Link href="/faq" className="hover:text-gray-900">
              FAQ
            </Link>
            <Link href="/login" className="hover:text-gray-900">
              Sign in
            </Link>
          </nav>
          <p>
            🔒 We never store your recipients&apos; email addresses from guest sends. Each
            verification page shows only the name, certificate, issuer and date.
          </p>
          <p>© {new Date().getFullYear()} SendCert</p>
        </div>
      </footer>
    </div>
  );
}
