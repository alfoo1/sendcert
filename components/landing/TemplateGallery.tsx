import Link from 'next/link';
import { PRESET_TEMPLATES, presetDescription, presetName } from '@/lib/templates';
import { TemplateThumbnail } from '@/components/CertificateRenderer';
import { localizePath, tx, type Locale } from '@/lib/i18n';

// Live renders of the built-in templates, so the landing always shows the
// designs exactly as they look in the app.
export default function TemplateGallery({ locale = 'en' }: { locale?: Locale }) {
  const appHref = localizePath('/app', locale);
  return (
    <section id="templates" className="scroll-mt-20 border-t border-gray-100 bg-gray-50 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {tx(locale, {
              en: 'Start from a professional design',
              es: 'Empieza con un diseño profesional',
            })}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {tx(locale, {
              en: 'Change every word, the color and add your logo — or upload your own design from Canva or any other tool.',
              es: 'Cambia cada palabra y el color, y agrega tu logo. O sube tu propio diseño hecho en Canva o en cualquier otra herramienta.',
            })}
          </p>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRESET_TEMPLATES.map((tpl) => (
            <li key={tpl.id}>
              <Link
                href={appHref}
                className="group block overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-lg"
              >
                <div className="bg-gray-100 p-3">
                  <div className="overflow-hidden rounded-md shadow-sm ring-1 ring-black/5">
                    {locale === 'es' ? (
                      <TemplateThumbnail templateId={tpl.id} sampleName="María González" />
                    ) : (
                      <TemplateThumbnail templateId={tpl.id} />
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900">{presetName(tpl.id, locale)}</p>
                  <p className="mt-1 text-sm text-gray-500">{presetDescription(tpl.id, locale)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Link
            href={appHref}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
          >
            {tx(locale, { en: 'Use a template →', es: 'Usar una plantilla →' })}
          </Link>
        </div>
      </div>
    </section>
  );
}
