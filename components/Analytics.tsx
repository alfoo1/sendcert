'use client';

import Script from 'next/script';

// Gate the entire GA4 pipeline behind these two checks:
//   1. An ID is configured (so forks/local clones stay silent by default).
//   2. We're in production (so dev clicks don't pollute real metrics).
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Loads the GA4 snippet after the page becomes interactive. Both conditions
 * must hold or the component is an inert no-op.
 */
export default function Analytics() {
  if (!GA_ID || !isProduction) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}

/**
 * Fire a GA4 custom event. Safe no-op when gtag isn't loaded (dev, missing ID,
 * or during SSR) so call sites don't need to guard themselves.
 */
export function trackEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') return;
  gtag('event', name, params);
}
