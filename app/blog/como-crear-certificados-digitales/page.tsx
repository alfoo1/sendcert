import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to create professional digital certificates',
  description:
    'A step-by-step guide to designing professional digital certificates for your courses and trainings, with design and delivery best practices.',
  openGraph: {
    title: 'How to create professional digital certificates',
    description:
      'A step-by-step guide to designing professional digital certificates for your courses and trainings.',
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
          How to create professional digital certificates
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Everything you need to know to design and deliver certificates your recipients
          will value and share.
        </p>
      </header>

      {/* Placeholder content — ready to expand into the real post. */}
      <p>
        This article will soon cover best practices for creating digital certificates.
      </p>

      <h2>Topics we'll cover</h2>
      <ul>
        <li>Must-have elements on a certificate</li>
        <li>Recommended formats and resolutions</li>
        <li>Readable and professional typography</li>
        <li>Adding digital signatures and seals</li>
        <li>Validation and QR codes</li>
      </ul>

      <h2>In the meantime…</h2>
      <p>You can start generating certificates right now with SendCert. No sign-up.</p>
    </>
  );
}
