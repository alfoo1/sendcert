import Link from 'next/link';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { localizePath, tx, type Locale, type Tx } from '@/lib/i18n';

// Question / Answer pairs rendered on the page AND serialized into the
// schema.org FAQPage JSON-LD. Keeping them in a single source of truth avoids
// drift between the visible copy and the structured data Google/LLMs consume.
const FAQS: { question: Tx; answer: Tx }[] = [
  {
    question: { en: 'What is SendCert?', es: '¿Qué es SendCert?' },
    answer: {
      en: 'SendCert is a free web tool for teachers, trainers, course creators and nonprofits that creates personalized PDF certificates and delivers them by email in a single flow. You pick a design or upload your own, add your recipients, and every person gets their own PDF with their name, plus a public verification page with a unique ID so anyone can check the certificate is real. The whole process takes minutes, even for large groups.',
      es: 'SendCert es una herramienta web gratuita para docentes, capacitadores, creadores de cursos y ONG que crea certificados PDF personalizados y los envía por correo en un solo flujo. Eliges un diseño o subes el tuyo, agregas a tus destinatarios y cada persona recibe su propio PDF con su nombre, además de una página pública de verificación con un ID único para que cualquiera pueda comprobar que el certificado es auténtico. Todo el proceso toma minutos, incluso con grupos grandes.',
    },
  },
  {
    question: { en: 'Is SendCert free?', es: '¿SendCert es gratis?' },
    answer: {
      en: 'Yes. Without an account you can send up to 100 certificates per month. With a free account (just your email, no password) the limit goes up to 300 per month, enough for most course cohorts and workshops. There is no free trial and no credit card required. If you regularly need more, you can leave your email to be notified when larger plans launch.',
      es: 'Sí. Sin cuenta puedes enviar hasta 100 certificados por mes. Con una cuenta gratuita (solo tu correo, sin contraseña) el límite sube a 300 por mes, suficiente para la mayoría de los cursos y talleres. No es un periodo de prueba y no se pide tarjeta de crédito. Si necesitas más con frecuencia, puedes dejar tu correo para enterarte cuando lancemos planes más grandes.',
    },
  },
  {
    question: { en: 'Do I need to create an account?', es: '¿Necesito crear una cuenta?' },
    answer: {
      en: 'No. You can go straight to the app, upload your template and recipient list, and send as a guest. Guest sends get the same verification link for every certificate. A free account is optional: you sign in with a one-time link sent to your email, and you get a higher monthly limit (300 instead of 100) and a dashboard with your send history.',
      es: 'No. Puedes ir directo a la app, subir tu plantilla y tu lista de destinatarios, y enviar como invitado. Los envíos como invitado también incluyen el enlace de verificación en cada certificado. La cuenta gratuita es opcional: inicias sesión con un enlace de un solo uso que te llega por correo, y obtienes un límite mensual más alto (300 en lugar de 100) y un panel con tu historial de envíos.',
    },
  },
  {
    question: { en: 'How many certificates can I send?', es: '¿Cuántos certificados puedo enviar?' },
    answer: {
      en: 'As a guest, up to 100 certificates per calendar month, counted per network connection. With a free account, up to 300 per month. Counters reset automatically on the first of each month, and certificates that fail to deliver are not counted. For one-off larger batches, reach out and we can usually accommodate.',
      es: 'Como invitado, hasta 100 certificados por mes calendario, contados por conexión de red. Con una cuenta gratuita, hasta 300 por mes. Los contadores se reinician automáticamente el primer día de cada mes, y los certificados que no se pudieron entregar no se cuentan. Si necesitas hacer un envío puntual más grande, escríbenos y por lo general podemos ayudarte.',
    },
  },
  {
    question: {
      en: 'What file formats are supported for templates?',
      es: '¿Qué formatos de archivo se aceptan para las plantillas?',
    },
    answer: {
      en: 'You can upload your own template as a JPG or PNG image. SVG is also supported via the built-in template designs. PDFs are not accepted as the source template — export to PNG or JPG first. For best print quality we recommend uploading at 1200 × 900 pixels or larger so the generated PDF stays sharp when recipients print their certificate.',
      es: 'Puedes subir tu propia plantilla como imagen JPG o PNG. Los diseños incluidos también usan SVG. No se aceptan archivos PDF como plantilla de origen, así que primero expórtala a PNG o JPG. Para la mejor calidad de impresión, te recomendamos subirla en 1200 × 900 píxeles o más, así el PDF generado se ve nítido cuando tus destinatarios imprimen su certificado.',
    },
  },
  {
    question: {
      en: 'Can I upload my own certificate design?',
      es: '¿Puedo subir mi propio diseño de certificado?',
    },
    answer: {
      en: 'Yes. Design your certificate in Canva, Figma, Photoshop, or any tool that exports to JPG or PNG, then upload it in step 1 of the wizard. Leave visible blank space where the recipient name should land — you can then drag the name to the correct position on the live preview. If you prefer, pick one of six professionally designed templates and customize every text, color and logo without any outside design work.',
      es: 'Sí. Diseña tu certificado en Canva, Figma, Photoshop o cualquier herramienta que exporte a JPG o PNG, y súbelo en el paso 1 del asistente. Deja un espacio en blanco visible donde debe ir el nombre de cada persona: después puedes arrastrar el nombre a la posición correcta en la vista previa. Si prefieres, elige una de las seis plantillas con diseño profesional y personaliza cada texto, el color y el logo sin tener que diseñar nada por tu cuenta.',
    },
  },
  {
    question: {
      en: 'How do recipients receive their certificates?',
      es: '¿Cómo reciben sus certificados los destinatarios?',
    },
    answer: {
      en: 'Each recipient gets an individual email from our branded sender address with their personalized PDF attached, plus buttons to view and verify the certificate online and to add it to LinkedIn. The subject line and body can include a `{{name}}` variable so every email feels written for that specific person. The PDF opens in any standard reader on desktop or mobile, with no app or login required on their side. You can also add a Reply-To address so replies land in your own inbox.',
      es: 'Cada destinatario recibe un correo individual desde nuestra dirección de envío, con su PDF personalizado adjunto y botones para ver y verificar el certificado en línea y para agregarlo a LinkedIn. El asunto y el cuerpo pueden incluir la variable `{{name}}` para que cada correo se sienta escrito para esa persona. El PDF se abre en cualquier lector estándar, en computadora o en el celular, sin que tengan que instalar una app ni iniciar sesión. También puedes agregar una dirección de respuesta (Reply-To) para que las respuestas lleguen a tu propio correo.',
    },
  },
  {
    question: {
      en: 'Is my data stored on your servers?',
      es: '¿Mis datos se guardan en sus servidores?',
    },
    answer: {
      en: "Only what verification needs. For guest sends we never store email addresses: we keep the recipient's name, the certificate name, the issuer, the issue date and the certificate design, because that is what each verification page shows. Sends from a free account also keep the recipient's email so you can see your send history. If you turn verification off before sending, nothing is stored except anonymous counts of how many certificates were sent. Feedback and waitlist emails you choose to submit are also saved.",
      es: 'Solo lo que la verificación necesita. En los envíos como invitado nunca guardamos direcciones de correo: guardamos el nombre del destinatario, el nombre del certificado, quién lo emitió, la fecha de emisión y el diseño del certificado, porque eso es lo que muestra cada página de verificación. Los envíos desde una cuenta gratuita también guardan el correo del destinatario para que puedas ver tu historial de envíos. Si desactivas la verificación antes de enviar, no se guarda nada, salvo un conteo anónimo de cuántos certificados se enviaron. También se guardan los comentarios y los correos de la lista de espera que decidas enviarnos.',
    },
  },
  {
    question: {
      en: 'How does certificate verification work?',
      es: '¿Cómo funciona la verificación de certificados?',
    },
    answer: {
      en: "Every certificate you send gets its own public page at sendcert.org/verify/ followed by a unique ID, such as CERT-2026-K7QM-4TXP. The page shows the certificate with the recipient's name, the certificate name, who issued it, the issue date and its status. Anyone, such as an employer, a school or a licensing board, can open the link and confirm the certificate is genuine. IDs are random, so they can't be guessed, and an edited PDF won't match its verification page, which makes certificates much harder to fake. Verification is free and needs no account, for you or your recipients.",
      es: 'Cada certificado que envías tiene su propia página pública en sendcert.org/verify/ seguida de un ID único, como CERT-2026-K7QM-4TXP. La página muestra el certificado con el nombre del destinatario, el nombre del certificado, quién lo emitió, la fecha de emisión y su estado. Cualquier persona, como un empleador, una escuela o una entidad certificadora, puede abrir el enlace y confirmar que el certificado es auténtico. Los ID son aleatorios, así que no se pueden adivinar, y un PDF editado no va a coincidir con su página de verificación, lo que hace que los certificados sean mucho más difíciles de falsificar. La verificación es gratis y no requiere cuenta, ni para ti ni para tus destinatarios.',
    },
  },
  {
    question: {
      en: 'Can recipients add their certificate to LinkedIn?',
      es: '¿Los destinatarios pueden agregar su certificado a LinkedIn?',
    },
    answer: {
      en: 'Yes. The certificate email and the verification page both have an "Add to LinkedIn" button that fills in the Licenses & certifications section of the recipient\'s profile, with a "Show credential" link back to the verification page. There is also a button to share the certificate in a LinkedIn post. Recipients only need to review and save.',
      es: 'Sí. Tanto el correo del certificado como la página de verificación tienen un botón “Agregar a LinkedIn” que completa la sección Licencias y certificaciones del perfil, con un enlace “Mostrar credencial” que lleva a la página de verificación. También hay un botón para compartir el certificado en una publicación de LinkedIn. Solo tienen que revisar y guardar.',
    },
  },
  {
    question: { en: 'Can I turn verification off?', es: '¿Puedo desactivar la verificación?' },
    answer: {
      en: 'Yes. Verification is on by default, and you can switch it off in the email step before sending. With verification off, recipients still get their PDF by email, but no verification page is created and nothing about the certificates is stored.',
      es: 'Sí. La verificación está activada por defecto y puedes desactivarla en el paso del correo, antes de enviar. Con la verificación desactivada, los destinatarios igual reciben su PDF por correo, pero no se crea ninguna página de verificación y no se guarda nada sobre los certificados.',
    },
  },
  {
    question: { en: 'Do certificates expire?', es: '¿Los certificados vencen?' },
    answer: {
      en: "Not by default. Certificates sent with SendCert have no expiry date, so their verification pages keep showing them as valid. Course completion and attendance certificates usually don't need one.",
      es: 'No, por defecto no. Los certificados enviados con SendCert no tienen fecha de vencimiento, así que sus páginas de verificación los siguen mostrando como válidos. Los certificados de finalización de cursos y de asistencia normalmente no la necesitan.',
    },
  },
  {
    question: { en: 'Can I add my logo to the certificate?', es: '¿Puedo agregar mi logo al certificado?' },
    answer: {
      en: 'Yes. In step 2 of the wizard you can upload a logo in PNG, JPG, or SVG format (up to 2 MB). Drag it anywhere on the certificate, resize it with the slider, and it will be included in every PDF delivered. Logos work on both the built-in templates and your own uploaded designs. We recommend a transparent PNG around 60 pixels tall for the cleanest result.',
      es: 'Sí. En el paso 2 del asistente puedes subir un logo en formato PNG, JPG o SVG (hasta 2 MB). Arrástralo a cualquier parte del certificado, ajusta su tamaño con el control deslizante y se incluirá en cada PDF que envíes. Los logos funcionan tanto en las plantillas incluidas como en tus propios diseños. Para un resultado más limpio, te recomendamos un PNG con fondo transparente de unos 60 píxeles de alto.',
    },
  },
  {
    question: {
      en: 'What happens when I reach the free limit?',
      es: '¿Qué pasa cuando llego al límite gratuito?',
    },
    answer: {
      en: 'SendCert shows a message before anything is sent. As a guest, you can create a free account and keep going with up to 300 certificates per month. With an account, you can leave your email to hear about larger plans. A send that would go over the limit is rejected as a whole, so nothing is partially delivered. Counters reset automatically on the first day of each month.',
      es: 'SendCert te muestra un aviso antes de enviar nada. Como invitado, puedes crear una cuenta gratuita y seguir enviando hasta 300 certificados por mes. Con una cuenta, puedes dejar tu correo para enterarte de los planes más grandes. Un envío que superaría el límite se rechaza completo, así que nada se entrega a medias. Los contadores se reinician automáticamente el primer día de cada mes.',
    },
  },
  {
    question: { en: 'Does it work for any language?', es: '¿Funciona en cualquier idioma?' },
    answer: {
      en: 'Mostly. Every text element on the built-in templates — heading, subtitle, body text, signatures — is an editable field, so you can write the certificate in any language. Recipient names print in Latin alphabets, including accents, tildes, and cedillas (José, Núñez, François). Letters outside the standard PDF fonts, like the Vietnamese ễ or Polish ł, print as their base letter. Names written entirely in another alphabet, such as Chinese or Arabic, are not supported yet.',
      es: 'En gran parte, sí. Cada texto de las plantillas incluidas (título, subtítulo, cuerpo y firmas) es un campo editable, así que puedes escribir el certificado en cualquier idioma. Los nombres de los destinatarios se imprimen en alfabeto latino, con acentos, eñes y cedillas (José, Núñez, François). Las letras que no están en las fuentes estándar de PDF, como la ễ vietnamita o la ł polaca, se imprimen como su letra base. Los nombres escritos por completo en otro alfabeto, como el chino o el árabe, todavía no son compatibles.',
    },
  },
  {
    question: {
      en: 'Can I send certificates in Spanish or other languages?',
      es: '¿Puedo enviar certificados en inglés o en otros idiomas?',
    },
    answer: {
      en: 'Yes. You can fully customize the certificate content, email subject, and email body in Spanish, Portuguese, French, German, or any language you need. The `{{name}}` variable works the same way regardless of the language of the surrounding text. The SendCert interface is available in English and Spanish, and the certificates and emails your recipients receive are entirely under your control.',
      es: 'Sí. Puedes personalizar por completo el contenido del certificado, el asunto y el cuerpo del correo en español, inglés, portugués, francés, alemán o el idioma que necesites. La variable `{{name}}` funciona igual sin importar el idioma del texto que la rodea. La interfaz de SendCert está disponible en español y en inglés, y los certificados y correos que reciben tus destinatarios quedan completamente bajo tu control.',
    },
  },
];

/** Builds the schema.org FAQPage JSON-LD payload, in the page language. */
function buildFaqJsonLd(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    ...(locale === 'es' ? { inLanguage: 'es' } : {}),
    mainEntity: FAQS.map((item) => ({
      '@type': 'Question',
      name: tx(locale, item.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: tx(locale, item.answer),
      },
    })),
  };
}

export default function FaqPage({ locale }: { locale: Locale }) {
  const jsonLd = buildFaqJsonLd(locale);

  return (
    <LocaleProvider locale={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Simple shared header — matches the blog/landing layout so the FAQ
          page feels like part of the rest of the site. */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href={localizePath('/', locale)} className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              S
            </span>
            SendCert
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href={localizePath('/blog', locale)} className="text-gray-600 hover:text-gray-900">
              Blog
            </Link>
            <LanguageSwitcher locale={locale} enPath="/faq" className="hidden sm:inline" />
            <Link
              href={localizePath('/app', locale)}
              className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
            >
              {tx(locale, { en: 'Open app', es: 'Abrir app' })}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            {tx(locale, { en: 'FAQ', es: 'Ayuda' })}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {tx(locale, { en: 'Frequently Asked Questions', es: 'Preguntas frecuentes' })}
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            {tx(locale, {
              en: 'Everything you need to know about creating and sending certificates with SendCert.',
              es: 'Todo lo que necesitas saber para crear y enviar certificados con SendCert.',
            })}
          </p>
        </header>

        <dl className="space-y-10">
          {FAQS.map((item) => (
            <div key={item.question.en}>
              <dt className="text-xl font-semibold text-gray-900">
                {tx(locale, item.question)}
              </dt>
              <dd className="mt-2 text-gray-700 leading-relaxed">
                {tx(locale, item.answer)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-16 rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
          <p className="text-lg font-semibold text-gray-900">
            {tx(locale, { en: 'Still have questions?', es: '¿Te quedan dudas?' })}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {tx(locale, {
              en: 'The best way to find out if SendCert fits your workflow is to try it — free, no credit card required.',
              es: 'La mejor forma de saber si SendCert se adapta a tu forma de trabajar es probarlo. Es gratis y no pide tarjeta de crédito.',
            })}
          </p>
          <Link
            href={localizePath('/app', locale)}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
          >
            {tx(locale, {
              en: 'Create your first certificate free →',
              es: 'Crea tu primer certificado gratis →',
            })}
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center text-sm text-gray-500">
          <LanguageSwitcher locale={locale} enPath="/faq" className="!text-gray-500 hover:!text-gray-900" />
          <p>© {new Date().getFullYear()} SendCert</p>
        </div>
      </footer>
    </LocaleProvider>
  );
}
