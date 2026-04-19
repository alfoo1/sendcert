import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to send certificates by email in bulk',
  description:
    'Learn how to send personalized certificates by email to dozens or hundreds of recipients effortlessly, using templates with variables.',
  openGraph: {
    title: 'How to send certificates by email in bulk',
    description:
      'Learn how to send personalized certificates by email to dozens or hundreds of recipients effortlessly.',
  },
};

export default function Post() {
  return (
    <>
      <header className="mb-10 not-prose">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Guide
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          How to send certificates by email in bulk
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Automate certificate delivery to your recipients without losing the personal
          touch.
        </p>
      </header>

      {/* Placeholder content — ready to expand into the real post. */}
      <p>
        This article will soon cover how to deliver certificates at scale without
        setting up SMTP yourself.
      </p>

      <h2>Topics we'll cover</h2>
      <ul>
        <li>Why emails end up in spam and how to avoid it</li>
        <li>Designing a personalized message with variables</li>
        <li>Managing errors and retries</li>
        <li>Tracking deliverability</li>
        <li>Scaling beyond the free tier</li>
      </ul>

      <h2>In the meantime…</h2>
      <p>
        With SendCert you can send 50 certificates a month for free from our own
        branded sender — no SMTP setup required.
      </p>
    </>
  );
}
