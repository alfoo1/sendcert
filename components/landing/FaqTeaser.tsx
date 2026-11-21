import Link from 'next/link';
import { localizePath, tx, type Locale, type Tx } from '@/lib/i18n';

const QUESTIONS: { q: Tx; a: Tx }[] = [
  {
    q: { en: 'Do I need an account?', es: '¿Necesito una cuenta?' },
    a: {
      en: 'No. You can send up to 100 certificates a month as a guest, and every certificate still gets its own verification link. A free account raises the limit to 300 and keeps a history of your sends.',
      es: 'No. Puedes enviar hasta 100 certificados al mes como invitado, y cada certificado igual tiene su propio enlace de verificación. Con una cuenta gratuita el límite sube a 300 y guardas el historial de tus envíos.',
    },
  },
  {
    q: { en: 'What can I customize?', es: '¿Qué puedo personalizar?' },
    a: {
      en: 'Every word on the template, the accent color, your logo, and extra fields like date or signature. You can also upload your own design.',
      es: 'Cada palabra de la plantilla, el color, tu logo y campos extra como la fecha o la firma. También puedes subir tu propio diseño.',
    },
  },
  {
    q: { en: 'How do recipients get their certificate?', es: '¿Cómo reciben el certificado los destinatarios?' },
    a: {
      en: 'Each person receives an email with their own PDF certificate attached and a link to its verification page. Nothing to install or sign up for on their side.',
      es: 'Cada persona recibe un correo con su certificado en PDF adjunto y un enlace a su página de verificación. No tienen que instalar nada ni registrarse.',
    },
  },
  {
    q: { en: 'Is my recipient list stored?', es: '¿Se guarda mi lista de destinatarios?' },
    a: {
      en: "For guest sends we never store email addresses. We keep only what each verification page shows: the recipient's name, the certificate, the issuer and the date. You can turn verification off, and then nothing is kept.",
      es: 'En los envíos como invitado nunca guardamos los correos. Solo guardamos lo que muestra cada página de verificación: el nombre del destinatario, el certificado, quién lo emite y la fecha. Si desactivas la verificación, no se guarda nada.',
    },
  },
];

export default function FaqTeaser({ locale = 'en' }: { locale?: Locale }) {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {tx(locale, { en: 'Questions', es: 'Preguntas' })}
        </h2>
        <dl className="mt-10 divide-y divide-gray-200 border-y border-gray-200">
          {QUESTIONS.map((item) => (
            <div key={item.q.en} className="py-6">
              <dt className="font-semibold text-gray-900">{tx(locale, item.q)}</dt>
              <dd className="mt-2 text-gray-600">{tx(locale, item.a)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-center">
          <Link
            href={localizePath('/faq', locale)}
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            {tx(locale, { en: 'Read all questions →', es: 'Ver todas las preguntas →' })}
          </Link>
        </p>
      </div>
    </section>
  );
}
