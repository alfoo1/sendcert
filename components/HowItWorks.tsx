// Three-step story on the landing with simple iconography.
const STEPS = [
  {
    number: '1',
    title: 'Upload your template',
    description:
      'Pick one of our designs or upload your own image (JPG/PNG). Click or drag to place where the name should appear.',
    icon: '🎨',
  },
  {
    number: '2',
    title: 'Import your recipients',
    description:
      'Upload a CSV or Excel with names and emails. SendCert auto-generates a personalized PDF for each recipient.',
    icon: '📋',
  },
  {
    number: '3',
    title: 'Send by email',
    description:
      'Write your message using the {{name}} variable. Every certificate ships from our branded sender — no SMTP setup.',
    icon: '📨',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Three simple steps to automate certificate delivery for your recipients.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="relative rounded-2xl border border-gray-200 bg-white p-8 transition hover:border-brand-300 hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
                {step.icon}
              </div>
              <div className="mb-2 text-sm font-semibold text-brand-600">
                STEP {step.number}
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
