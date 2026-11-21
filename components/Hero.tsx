import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm text-brand-700">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          No sign-up · No credit card · Guest sends aren&apos;t stored
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Create and email <span className="text-brand-600">personalized certificates</span>
          <br className="hidden sm:block" />
          in minutes
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Send 200 certificates in 3 minutes. Upload your template, import your
          recipient list — SendCert generates a personalized PDF for each recipient
          and delivers it by email automatically. No design skills needed.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Get started free →
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50"
          >
            See how it works
          </Link>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-gray-500">
          <span>⚡ 100 certificates in seconds</span>
          <span>📬 Automatic email delivery</span>
          <span>🔒 Your data stays with you</span>
        </div>
      </div>
    </section>
  );
}
