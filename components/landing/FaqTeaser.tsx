import Link from 'next/link';

const QUESTIONS = [
  {
    q: 'Do I need an account?',
    a: 'No. You can send up to 100 certificates a month as a guest. A free account raises that to 300 and adds a verification link for each certificate.',
  },
  {
    q: 'What can I customize?',
    a: 'Every word on the template, the accent color, your logo, and extra fields like date or signature. You can also upload your own design.',
  },
  {
    q: 'How do recipients get their certificate?',
    a: 'Each person receives an email with their own PDF certificate attached. Nothing to install or sign up for on their side.',
  },
  {
    q: 'Is my recipient list stored?',
    a: "Guest sends aren't stored: the list is used only to deliver the certificates. With an account, certificates are saved so they can be verified.",
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
