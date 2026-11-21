const STEPS = [
  {
    title: 'Choose a design',
    description:
      'Start from a template or upload your own. Edit the text, the color and add your logo.',
  },
  {
    title: 'Add your recipients',
    description:
      'Upload a CSV or Excel file, paste from a spreadsheet, or type names and emails.',
  },
  {
    title: 'Send',
    description:
      'Each person gets an email with their own PDF certificate. You see who received it.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Three steps, a few minutes
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            No account, no setup. Open the app and send your first batch.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-gray-200 bg-white p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-base font-bold text-brand-700">
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-gray-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
