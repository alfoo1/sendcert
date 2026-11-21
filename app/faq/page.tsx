import type { Metadata } from 'next';
import Link from 'next/link';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'SendCert FAQ — Frequently Asked Questions',
  description:
    'Everything you need to know about creating and sending certificates with SendCert.',
  openGraph: {
    title: 'SendCert FAQ — Frequently Asked Questions',
    description:
      'Everything you need to know about creating and sending certificates with SendCert.',
  },
  alternates: {
    canonical: `${siteUrl}/faq`,
  },
};

// Question / Answer pairs rendered on the page AND serialized into the
// schema.org FAQPage JSON-LD. Keeping them in a single source of truth avoids
// drift between the visible copy and the structured data Google/LLMs consume.
const FAQS: { question: string; answer: string }[] = [
  {
    question: 'What is SendCert?',
    answer:
      'SendCert is a web tool for teachers, course creators, and workshop organizers that generates personalized PDF certificates and delivers them by email in a single flow. You upload a template image, upload a CSV of recipients, and SendCert creates a unique PDF for each person with their name and any custom fields you define. It then sends each certificate as an email attachment from a branded sender. The whole process takes minutes, even for large cohorts.',
  },
  {
    question: 'Is SendCert free?',
    answer:
      'Yes. Without an account you can send up to 30 certificates per month. With a free account (just your email, no password) the limit goes up to 150 per month, enough for most course cohorts and workshops. There is no free trial and no credit card required. If you regularly need more, you can leave your email to be notified when larger plans launch.',
  },
  {
    question: 'Do I need to create an account?',
    answer:
      'No. You can go straight to the app, upload your template and recipient list, and send as a guest. A free account is optional: you sign in with a one-time link sent to your email, and you get a higher monthly limit (150 instead of 30), a public verification link for every certificate, and a dashboard with your send history.',
  },
  {
    question: 'How many certificates can I send?',
    answer:
      'As a guest, up to 30 certificates per calendar month, counted per network connection. With a free account, up to 150 per month. Counters reset automatically on the first of each month, and certificates that fail to deliver are not counted. For one-off larger batches, reach out and we can usually accommodate.',
  },
  {
    question: 'What file formats are supported for templates?',
    answer:
      'You can upload your own template as a JPG or PNG image. SVG is also supported via the built-in template designs. PDFs are not accepted as the source template — export to PNG or JPG first. For best print quality we recommend uploading at 1200 × 900 pixels or larger so the generated PDF stays sharp when recipients print their certificate.',
  },
  {
    question: 'Can I upload my own certificate design?',
    answer:
      'Yes. Design your certificate in Canva, Figma, Photoshop, or any tool that exports to JPG or PNG, then upload it in step 1 of the wizard. Leave visible blank space where the recipient name should land — you can then drag the name to the correct position on the live preview. If you prefer, pick one of six professionally designed templates and customize every text, color and logo without any outside design work.',
  },
  {
    question: 'How do recipients receive their certificates?',
    answer:
      'Each recipient gets an individual email from our branded sender address with their personalized PDF attached. The subject line and body can include a `{{name}}` variable so every email feels written for that specific person. The PDF opens in any standard reader on desktop or mobile — no app or login required on their side. You can also add a Reply-To address so replies land in your own inbox.',
  },
  {
    question: 'Is my data stored on your servers?',
    answer:
      'For guest sends, no: recipient names, email addresses, templates, and generated PDFs are used only to create and deliver the certificates, and are not saved. We keep only anonymous counts (how many certificates were sent). With a free account, each certificate is saved (recipient name and email, course, dates, and the certificate image) so anyone can verify it at its public link. Feedback and waitlist emails you choose to submit are also saved.',
  },
  {
    question: 'Can I add my logo to the certificate?',
    answer:
      'Yes. In step 2 of the wizard you can upload a logo in PNG, JPG, or SVG format (up to 2 MB). Drag it anywhere on the certificate, resize it with the slider, and it will be included in every PDF delivered. Logos work on both the built-in templates and your own uploaded designs. We recommend a transparent PNG around 60 pixels tall for the cleanest result.',
  },
  {
    question: 'What happens when I reach the free limit?',
    answer:
      'SendCert shows a message explaining the limit. As a guest, you can create a free account and keep going with up to 150 certificates per month. With an account, you can leave your email to hear about larger plans. A send that would go over the limit is rejected as a whole, so nothing is partially delivered. Counters reset automatically on the first day of each month.',
  },
  {
    question: 'Does it work for any language?',
    answer:
      'Mostly. Every text element on the built-in templates — heading, subtitle, body text, signatures — is an editable field, so you can write the certificate in any language. Recipient names print in Latin alphabets, including accents, tildes, and cedillas (José, Núñez, François). Letters outside the standard PDF fonts, like the Vietnamese ễ or Polish ł, print as their base letter. Names written entirely in another alphabet, such as Chinese or Arabic, are not supported yet.',
  },
  {
    question: 'Can I send certificates in Spanish or other languages?',
    answer:
      'Yes. You can fully customize the certificate content, email subject, and email body in Spanish, Portuguese, French, German, or any language you need. The `{{name}}` variable works the same way regardless of the language of the surrounding text. The SendCert interface itself is in English but the certificates and emails your recipients receive are entirely under your control.',
  },
];

/** Builds the schema.org FAQPage JSON-LD payload from the FAQ list. */
function buildFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export default function FaqPage() {
  const jsonLd = buildFaqJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Simple shared header — matches the blog/landing layout so the FAQ
          page feels like part of the rest of the site. */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              S
            </span>
            SendCert
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/blog" className="text-gray-600 hover:text-gray-900">
              Blog
            </Link>
            <Link
              href="/app"
              className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
            >
              Open app
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            FAQ
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Everything you need to know about creating and sending certificates
            with SendCert.
          </p>
        </header>

        <dl className="space-y-10">
          {FAQS.map((item) => (
            <div key={item.question}>
              <dt className="text-xl font-semibold text-gray-900">
                {item.question}
              </dt>
              <dd className="mt-2 text-gray-700 leading-relaxed">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-16 rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
          <p className="text-lg font-semibold text-gray-900">
            Still have questions?
          </p>
          <p className="mt-1 text-sm text-gray-600">
            The best way to find out if SendCert fits your workflow is to try
            it — free, no credit card required.
          </p>
          <Link
            href="/app"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
          >
            Create your first certificate free →
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SendCert
        </div>
      </footer>
    </>
  );
}
