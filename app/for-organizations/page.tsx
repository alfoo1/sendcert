import type { Metadata } from 'next';
import Link from 'next/link';
import { sans } from '@/components/landing/fonts';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

const TITLE = 'Certificate software for schools, training providers and nonprofits';
const DESCRIPTION =
  'Issue verifiable certificates for courses, trainings and events. Bulk send from a spreadsheet, your own branding, a verification page for every certificate and one-click Add to LinkedIn.';

export const metadata: Metadata = {
  title: `SendCert for organizations · ${TITLE}`,
  description: DESCRIPTION,
  alternates: { canonical: `${siteUrl}/for-organizations` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${siteUrl}/for-organizations` },
};

const CONTACT = 'mailto:hola@sendcert.org?subject=SendCert%20for%20our%20organization';

const AUDIENCES = [
  {
    title: 'Schools and universities',
    text: 'Professional development for teachers, continuing education, workshops and student programs.',
  },
  {
    title: 'Training providers',
    text: 'Course completions, bootcamps and train-the-trainer programs, issued the day the course ends.',
  },
  {
    title: 'Nonprofits and public agencies',
    text: 'Volunteer, child-safety and community trainings that people need to prove they completed.',
  },
  {
    title: 'HR and L&D teams',
    text: 'Internal trainings, onboarding and compliance courses, with a record of who received what.',
  },
  {
    title: 'Conferences and webinars',
    text: 'Certificates of attendance for every participant, sent minutes after the event.',
  },
];

const FEATURES = [
  {
    title: 'Bulk issuing from a spreadsheet',
    text: 'Upload a CSV or Excel file, or paste a list. Every person gets their own personalized PDF by email.',
  },
  {
    title: 'Your organization’s branding',
    text: 'Start from a professional template with your logo and colors, or upload your own certificate design.',
  },
  {
    title: 'A verification page for every certificate',
    text: 'Each certificate has a unique ID and a public page that shows your organization as the issuer, so an edited PDF can’t pass as real.',
  },
  {
    title: 'Add to LinkedIn in one click',
    text: 'Recipients add the credential to their profile with your organization’s name on it, which puts your program in front of their network.',
  },
  {
    title: 'Replies come to you',
    text: 'Set your own reply-to address so questions and thank-you notes from participants reach your team.',
  },
  {
    title: 'Delivery report and privacy',
    text: 'See who received their certificate and download any failures. Verification pages are kept out of search engines and never show email addresses.',
  },
];

const FAQ = [
  {
    q: 'Can we use our own certificate design?',
    a: 'Yes. Upload a PNG or JPG of your design and position the recipient’s name on it, or start from one of the built-in templates and add your logo and colors.',
  },
  {
    q: 'How do employers or licensing boards check a certificate?',
    a: 'Every certificate links to a page on sendcert.org with the recipient’s name, the certificate name, your organization as the issuer, the date and a unique ID. If a PDF doesn’t match that page, it isn’t genuine.',
  },
  {
    q: 'How many certificates can we send?',
    a: 'Up to 300 a month with a free account, and 100 a month without one. If your organization needs more, write to us and we’ll work it out with you.',
  },
  {
    q: 'What data do you keep?',
    a: 'Only what verification needs: the recipient’s name, the certificate name, the issuer, the date and the certificate design. Sends from an account also keep recipient emails for your history. You can turn verification off for any send.',
  },
];

export default function ForOrganizationsPage() {
  return (
    <div className={sans.className}>
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              S
            </span>
            SendCert
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/faq" className="hidden text-gray-600 hover:text-gray-900 sm:inline">
              FAQ
            </Link>
            <a href={CONTACT} className="hidden text-gray-600 hover:text-gray-900 sm:inline">
              Contact
            </a>
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
        {/* Hero */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-5 pb-16 pt-16 text-center sm:px-6 sm:pt-20">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
              For schools, training providers and nonprofits
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Verifiable certificates for every course, training and event you run
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
              Upload your participant list and each person gets a personalized PDF certificate by
              email, plus a verification page with your organization as the issuer. No IT project,
              no per-certificate fees.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
              >
                Start issuing certificates →
              </Link>
              <a
                href={CONTACT}
                className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-7 py-3.5 text-base font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
              >
                Talk to us
              </a>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              Already used by a university, a statewide nonprofit and conference organizers, from
              the US to the UK and Oman.
            </p>
          </div>
        </section>

        {/* Who it's for */}
        <section className="border-t border-gray-100 bg-gray-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
              Built for organizations that train people
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {AUDIENCES.map((a) => (
                <div key={a.title} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <p className="font-semibold text-gray-900">{a.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{a.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Everything a certificate program needs
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                From the spreadsheet of participants to a credential they can prove.
              </p>
            </div>
            <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <p className="flex items-center gap-2 font-semibold text-gray-900">
                    <span className="text-brand-600" aria-hidden>
                      ✓
                    </span>
                    {f.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-gray-100 bg-gray-50 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-5 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
              How it works
            </h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-3">
              {[
                ['Design', 'Pick a template or upload your own design, and add your logo.'],
                ['Upload participants', 'Import a CSV or Excel file, or paste names and emails.'],
                ['Send', 'Everyone gets their PDF and verification link by email, in minutes.'],
              ].map(([title, text], i) => (
                <li key={title} className="rounded-2xl border border-gray-200 bg-white p-6">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <p className="mt-4 font-semibold text-gray-900">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-5 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Pricing</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
              Free for up to 300 certificates a month with an account, including verification
              pages and LinkedIn sharing. Need higher volumes or something specific for your
              organization? Let&apos;s talk.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
              >
                Create a free account
              </Link>
              <a
                href={CONTACT}
                className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
              >
                hola@sendcert.org
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-gray-100 bg-gray-50 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
              Questions from organizations
            </h2>
            <dl className="mt-10 space-y-8">
              {FAQ.map((item) => (
                <div key={item.q}>
                  <dt className="font-semibold text-gray-900">{item.q}</dt>
                  <dd className="mt-2 leading-relaxed text-gray-600">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 text-center text-sm text-gray-500 sm:px-6">
          <p className="max-w-md">
            Verifiable certificates shouldn&apos;t be a premium feature. SendCert makes them free
            for every teacher, trainer and nonprofit.
          </p>
          <p>
            <Link href="/" className="hover:text-gray-900">
              SendCert
            </Link>{' '}
            ·{' '}
            <a href="mailto:hola@sendcert.org" className="hover:text-gray-900">
              hola@sendcert.org
            </a>{' '}
            · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
