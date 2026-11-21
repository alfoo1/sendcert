import { tx, type Locale, type Tx } from '@/lib/i18n';

const STEPS: { title: Tx; description: Tx }[] = [
  {
    title: { en: 'Choose a design', es: 'Elige un diseño' },
    description: {
      en: 'Start from a template or upload your own. Edit the text, the color and add your logo.',
      es: 'Empieza con una plantilla o sube tu propio diseño. Edita el texto, el color y agrega tu logo.',
    },
  },
  {
    title: { en: 'Add your recipients', es: 'Agrega a tus destinatarios' },
    description: {
      en: 'Upload a CSV or Excel file, paste from a spreadsheet, or type names and emails.',
      es: 'Sube un archivo CSV o Excel, pega desde una hoja de cálculo o escribe nombres y correos.',
    },
  },
  {
    title: { en: 'Send', es: 'Envía' },
    description: {
      en: 'Each person gets an email with their own PDF certificate and a verification link. You see who received it.',
      es: 'Cada persona recibe un correo con su propio certificado en PDF y un enlace de verificación. Ves quién lo recibió.',
    },
  },
];

export default function HowItWorks({ locale = 'en' }: { locale?: Locale }) {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-gray-100 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {tx(locale, { en: 'Three steps, a few minutes', es: 'Tres pasos, pocos minutos' })}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {tx(locale, {
              en: 'No account, no setup. Open the app and send your first batch.',
              es: 'Sin cuenta y sin configurar nada. Abre la app y envía tu primer lote.',
            })}
          </p>
        </div>

        <ol className="mt-14 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title.en} className="rounded-2xl border border-gray-200 bg-white p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-base font-bold text-brand-700">
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-gray-900">{tx(locale, step.title)}</h3>
              <p className="mt-2 text-gray-600">{tx(locale, step.description)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
