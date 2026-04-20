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
      'Yes. SendCert is free for up to 50 certificates per IP address per month — enough to cover most course cohorts and workshops without any payment. There is no free trial, no credit card required, and no hidden paywall on core features. If you regularly exceed the monthly limit we plan to offer premium tiers in the future; you can leave your email to be notified.',
  },
  {
    question: 'Do I need to create an account?',
    answer:
      'No. SendCert does not require sign-up, email confirmation, or any form of authentication. You go directly to the app, upload your template and recipient list, and send. This is intentional — we believe short workflows should stay short. Nothing about your session is persisted once you close the tab.',
  },
  {
    question: 'How many certificates can I send?',
    answer:
      'The free tier allows 50 certificates per calendar month, counted by your client IP address. The cap resets automatically on the first of each month. If you hit the limit you will see a modal explaining the cap, with an option to leave your email for a notification when premium plans with higher limits launch. For one-off larger batches, reach out and we can usually accommodate.',
  },
  {
    question: 'What file formats are supported for templates?',
    answer:
      'You can upload your own template as a JPG or PNG image. SVG is also supported via the built-in template designs. PDFs are not accepted as the source template — export to PNG or JPG first. For best print quality we recommend uploading at 1200 × 900 pixels or larger so the generated PDF stays sharp when recipients print their certificate.',
  },
  {
    question: 'Can I upload my own certificate design?',
    answer:
      'Yes. Design your certificate in Canva, Figma, Photoshop, or any tool that exports to JPG or PNG, then upload it in step 1 of the wizard. Leave visible blank space where the recipient name should land — you can then drag the name to the correct position on the live preview. If you prefer, we also ship three professionally designed templates (Classic, Modern, Nature) that you can customize without any outside design work.',
  },
  {
    question: 'How do recipients receive their certificates?',
    answer:
      'Each recipient gets an individual email from our branded sender address with their personalized PDF attached. The subject line and body can include a `{{name}}` variable so every email feels written for that specific person. The PDF opens in any standard reader on desktop or mobile — no app or login required on their side. You can also add a Reply-To address so replies land in your own inbox.',
  },
  {
    question: 'Is my data stored on your servers?',
    answer:
      'No. Recipient names, email addresses, templates, and generated PDFs are processed in memory only and never written to disk. Once a send completes, the server discards all session data. The only information we persist is an optional waitlist signup (if you opt in when the rate limit hits) and anonymous operational metadata. See our privacy notices in the app for full detail.',
  },
  {
    question: 'Can I add my logo to the certificate?',
    answer:
      'Yes. In step 2 of the wizard you can upload a logo in PNG, JPG, or SVG format (up to 2 MB). Drag it anywhere on the certificate, resize it with the slider, and it will be included in every PDF delivered. Logos work on both the built-in templates and your own uploaded designs. We recommend a transparent PNG around 60 pixels tall for the cleanest result.',
  },
  {
    question: 'What happens when I reach the free limit?',
    answer:
      'When your IP hits the monthly cap, SendCert opens a modal explaining the limit and offers to save your email for premium plan notifications. Your in-progress send is not partially charged or partially delivered — the whole request is rejected cleanly so you can retry next month or opt into a larger plan. The counter resets automatically on the first day of the following month, no action required.',
  },
  {
    question: 'Does it work for any language?',
    answer:
      'Yes. Every text element on the built-in templates — heading, subtitle, body text, signature, date — is a fully editable field in the sidebar. Type your content in any language, including non-Latin scripts, and it will render in the final PDF. Recipient names can include accents, tildes, cedillas, and most Unicode characters. For the best visual result, pick a font that includes the glyphs your language needs.',
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
            it — free for your first 50 recipients, no sign-up.
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
