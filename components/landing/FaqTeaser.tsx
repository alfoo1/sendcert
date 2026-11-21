import Link from 'next/link';

const QUESTIONS = [
  {
    q: 'Do I need an account?',
    a: 'No. You can send up to 100 certificates a month as a guest, and every certificate still gets its own verification link. A free account raises the limit to 300 and keeps a history of your sends.',
  },
  {
    q: 'What can I customize?',
    a: 'Every word on the template, the accent color, your logo, and extra fields like date or signature. You can also upload your own design.',
  },
  {
    q: 'How do recipients get their certificate?',
    a: 'Each person receives an email with their own PDF certificate attached and a link to its verification page. Nothing to install or sign up for on their side.',
  },
  {
    q: 'Is my recipient list stored?',
    a: "For guest sends we never store email addresses. We keep only what each verification page shows: the recipient's name, the certificate, the issuer and the date. You can turn verification off, and then nothing is kept.",
  },
];

export default function FaqTeaser() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Questions
        </h2>
        <dl className="mt-10 divide-y divide-gray-200 border-y border-gray-200">
          {QUESTIONS.map((item) => (
            <div key={item.q} className="py-6">
              <dt className="font-semibold text-gray-900">{item.q}</dt>
              <dd className="mt-2 text-gray-600">{item.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-center">
          <Link href="/faq" className="font-semibold text-brand-600 hover:text-brand-700">
            Read all questions →
          </Link>
        </p>
      </div>
    </section>
  );
}
