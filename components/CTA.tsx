import Link from 'next/link';

export default function CTA() {
  return (
    <section className="bg-brand-600 py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Start sending certificates now
        </h2>
        <p className="mt-4 text-lg text-brand-100">
          No credit card. 30 certificates a month without an account, 150 with a
          free one.
        </p>
        <div className="mt-8">
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
          >
            Open SendCert →
          </Link>
        </div>
      </div>
    </section>
  );
}
