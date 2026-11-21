import Link from 'next/link';

const PLANS = [
  {
    name: 'As a guest',
    tagline: 'No account needed',
    limit: '30 certificates / month',
    features: ['All templates or your own design', 'PDF certificate by email', 'Delivery report'],
    cta: { label: 'Start sending', href: '/app' },
    highlighted: false,
  },
  {
    name: 'Free account',
    tagline: 'Sign in with an email link, no password',
    limit: '300 certificates / month',
    features: [
      'Everything in guest',
      'Public verification link for every certificate',
      'History of your sends',
    ],
    cta: { label: 'Create a free account', href: '/login' },
    highlighted: true,
  },
];

export default function FreePlans() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-5 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Free to use
          </h2>
          <p className="mt-4 text-lg text-gray-600">No credit card. Limits reset every month.</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border bg-white p-7 ${
                plan.highlighted ? 'border-brand-600 shadow-lg ring-1 ring-brand-600' : 'border-gray-200'
              }`}
            >
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>
              <p className="mt-5 text-2xl font-bold text-gray-900">{plan.limit}</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-gray-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-brand-600" aria-hidden>
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.cta.href}
                className={`mt-7 inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition ${
                  plan.highlighted
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                }`}
              >
                {plan.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
