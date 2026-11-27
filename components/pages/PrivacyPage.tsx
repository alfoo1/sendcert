import Link from 'next/link';
import DocShell from '@/components/pages/DocShell';
import { localizePath, type Locale } from '@/lib/i18n';

export const PRIVACY_COPY = {
  title: { en: 'Privacy Policy', es: 'Política de privacidad' },
  description: {
    en: 'What data SendCert collects when you create and send certificates, why, how long we keep it and how to delete it.',
    es: 'Qué datos recopila SendCert cuando creas y envías certificados, para qué, cuánto tiempo los guardamos y cómo eliminarlos.',
  },
};

const UPDATED = { en: 'Last updated: November 26, 2026', es: 'Última actualización: 26 de noviembre de 2026' };

/** /privacy and /es/privacidad. Keep both languages in sync. */
export default function PrivacyPage({ locale }: { locale: Locale }) {
  return (
    <DocShell locale={locale} enPath="/privacy">
      <h1>{PRIVACY_COPY.title[locale]}</h1>
      <p className="text-sm text-gray-500">{UPDATED[locale]}</p>
      {locale === 'es' ? <PrivacyEs /> : <PrivacyEn />}
    </DocShell>
  );
}

function PrivacyEn() {
  return (
    <>
      <p>
        SendCert (sendcert.org) creates personalized PDF certificates and emails them to recipients. This policy explains
        what data we handle and why. Questions or requests: <a href="mailto:hola@sendcert.org">hola@sendcert.org</a>.
      </p>

      <h2>Data we handle</h2>
      <h3>When you send certificates</h3>
      <ul>
        <li>
          <strong>Recipient names and email addresses.</strong> We use them to generate each PDF and deliver it. If you
          send without an account, we do not store recipient email addresses after sending. If you send while signed
          in, we store them with each certificate so you can see your send history.
        </li>
        <li>
          <strong>Verification records.</strong> For every certificate we keep the recipient&apos;s name, the
          credential name, the issuer, the issue and expiry dates, and the certificate design, so its verification
          page keeps working. Verification pages are public by design: anyone with the link can see that information.
          They never show email addresses.
        </li>
        <li>
          <strong>Usage counters.</strong> To apply the free monthly limits we count sends per account, or per salted
          hash of the IP address for guests (we don&apos;t store the IP address itself), and we log the number of
          recipients, deliveries and failures of each send and the template used.
        </li>
      </ul>

      <h3>When you use SendCert from an AI assistant</h3>
      <p>
        If you connect SendCert to an assistant such as Claude, ChatGPT or Gemini, we receive only what the assistant
        sends to our tools: certificate texts, the recipient list (names and emails), the email message, and the
        assistant&apos;s technical client identifier. We don&apos;t receive your conversation. We save that information
        as a draft so you can review it on sendcert.org, and we delete it 24 hours after it is created. Nothing is sent
        to recipients unless you click Send. The assistant provider handles your conversation under its own privacy
        policy.
      </p>

      <h3>If you create an account</h3>
      <p>
        We store your email address, a display name derived from it, your plan and your monthly usage. You sign in with
        a one-time link sent to your email; we don&apos;t use passwords.
      </p>

      <h3>Other things you may send us</h3>
      <ul>
        <li>Feedback: a rating and an optional comment.</li>
        <li>Waitlist: your email address and, optionally, what you need.</li>
        <li>Share clicks: we count clicks on the LinkedIn and copy-link buttons, without personal data.</li>
      </ul>

      <h3>Analytics</h3>
      <p>
        We use Google Analytics and Vercel Web Analytics to understand how the site is used (pages visited, steps
        completed). Google Analytics uses cookies. We don&apos;t send names or email addresses to analytics tools.
      </p>

      <h3>Error logs</h3>
      <p>
        When something fails, for example a sign-in link or an email delivery, we record technical details (the page,
        the error message and the browser type) so we can fix it. These logs never include names or email addresses.
      </p>

      <h2>How we use data</h2>
      <p>
        Only to provide the service: generating and delivering certificates, running verification pages, applying
        limits, preventing abuse and improving SendCert. We don&apos;t sell personal data, we don&apos;t use recipient
        emails for marketing, and we don&apos;t share data with third parties except the service providers below.
      </p>

      <h2>Service providers</h2>
      <ul>
        <li>Vercel: hosting and web analytics.</li>
        <li>Supabase: database and sign-in.</li>
        <li>Resend: email delivery.</li>
        <li>Google Analytics: site analytics.</li>
      </ul>

      <h2>How long we keep data</h2>
      <ul>
        <li>AI assistant drafts: 24 hours.</li>
        <li>Error logs: 90 days.</li>
        <li>Verification records: as long as the certificate should remain verifiable, or until removal is requested.</li>
        <li>Accounts and their send history: until you ask us to delete them.</li>
      </ul>

      <h2>Your choices</h2>
      <p>
        Write to <a href="mailto:hola@sendcert.org">hola@sendcert.org</a> to access, correct or delete your data, to
        delete your account, or to remove a verification page. If you received a certificate and want its verification
        page removed, you can ask us directly or ask the organization that issued it.
      </p>

      <h2>Responsibility of issuers</h2>
      <p>
        Organizations and people who send certificates decide who receives them and what they say, and must have the
        right to use their recipients&apos; names and email addresses for this purpose. SendCert is not directed at
        children; when certificates are issued to minors, the issuer is responsible for having the necessary consent.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy we will update this page and the date above. Also see our{' '}
        <Link href={localizePath('/terms', 'en')}>terms of service</Link>.
      </p>
    </>
  );
}

function PrivacyEs() {
  return (
    <>
      <p>
        SendCert (sendcert.org) crea certificados en PDF personalizados y los envía por correo a sus destinatarios. Esta
        política explica qué datos manejamos y para qué. Preguntas o solicitudes:{' '}
        <a href="mailto:hola@sendcert.org">hola@sendcert.org</a>.
      </p>

      <h2>Datos que manejamos</h2>
      <h3>Cuando envías certificados</h3>
      <ul>
        <li>
          <strong>Nombres y correos de los destinatarios.</strong> Los usamos para generar cada PDF y enviarlo. Si
          envías sin cuenta, no guardamos los correos de los destinatarios después del envío. Si envías con tu cuenta,
          los guardamos junto con cada certificado para que puedas ver tu historial de envíos.
        </li>
        <li>
          <strong>Registros de verificación.</strong> De cada certificado guardamos el nombre de quien lo recibe, el
          nombre de la credencial, quién la emite, las fechas de emisión y vencimiento, y el diseño del certificado,
          para que su página de verificación siga funcionando. Las páginas de verificación son públicas a propósito:
          cualquiera que tenga el enlace puede ver esa información. Nunca muestran correos electrónicos.
        </li>
        <li>
          <strong>Contadores de uso.</strong> Para aplicar los límites gratuitos mensuales contamos los envíos por
          cuenta o, en el caso de invitados, por un hash con sal de la dirección IP (no guardamos la IP), y registramos
          la cantidad de destinatarios, entregas y errores de cada envío y la plantilla utilizada.
        </li>
      </ul>

      <h3>Cuando usas SendCert desde un asistente de IA</h3>
      <p>
        Si conectas SendCert a un asistente como Claude, ChatGPT o Gemini, solo recibimos lo que el asistente envía a
        nuestras herramientas: los textos del certificado, la lista de destinatarios (nombres y correos), el mensaje del
        correo y el identificador técnico del asistente. No recibimos tu conversación. Guardamos esa información como
        borrador para que la revises en sendcert.org, y la eliminamos 24 horas después de crearla. No se envía nada a
        los destinatarios hasta que haces clic en Enviar. El proveedor del asistente trata tu conversación según su
        propia política de privacidad.
      </p>

      <h3>Si creas una cuenta</h3>
      <p>
        Guardamos tu correo, un nombre visible tomado de ese correo, tu plan y tu uso mensual. Inicias sesión con un
        enlace de un solo uso que te llega por correo; no usamos contraseñas.
      </p>

      <h3>Otras cosas que puedes enviarnos</h3>
      <ul>
        <li>Opiniones: una calificación y un comentario opcional.</li>
        <li>Lista de espera: tu correo y, si quieres, lo que necesitas.</li>
        <li>Clics para compartir: contamos los clics en los botones de LinkedIn y de copiar enlace, sin datos personales.</li>
      </ul>

      <h3>Analítica</h3>
      <p>
        Usamos Google Analytics y Vercel Web Analytics para entender cómo se usa el sitio (páginas visitadas, pasos
        completados). Google Analytics usa cookies. No enviamos nombres ni correos a las herramientas de analítica.
      </p>

      <h3>Registros de errores</h3>
      <p>
        Cuando algo falla, por ejemplo un enlace de acceso o el envío de un correo, registramos datos técnicos (la
        página, el mensaje de error y el tipo de navegador) para poder corregirlo. Estos registros nunca incluyen
        nombres ni correos.
      </p>

      <h2>Para qué usamos los datos</h2>
      <p>
        Solo para prestar el servicio: generar y enviar certificados, mantener las páginas de verificación, aplicar los
        límites, prevenir abusos y mejorar SendCert. No vendemos datos personales, no usamos los correos de los
        destinatarios para marketing y no compartimos datos con terceros, salvo con los proveedores que se indican
        abajo.
      </p>

      <h2>Proveedores</h2>
      <ul>
        <li>Vercel: alojamiento y analítica web.</li>
        <li>Supabase: base de datos e inicio de sesión.</li>
        <li>Resend: envío de correos.</li>
        <li>Google Analytics: analítica del sitio.</li>
      </ul>

      <h2>Cuánto tiempo guardamos los datos</h2>
      <ul>
        <li>Borradores de asistentes de IA: 24 horas.</li>
        <li>Registros de errores: 90 días.</li>
        <li>
          Registros de verificación: mientras el certificado deba poder verificarse, o hasta que se pida eliminarlo.
        </li>
        <li>Cuentas y su historial de envíos: hasta que nos pidas eliminarlos.</li>
      </ul>

      <h2>Tus opciones</h2>
      <p>
        Escríbenos a <a href="mailto:hola@sendcert.org">hola@sendcert.org</a> para acceder a tus datos, corregirlos o
        eliminarlos, para borrar tu cuenta o para dar de baja una página de verificación. Si recibiste un certificado y
        quieres que se elimine su página de verificación, puedes pedírnoslo directamente o pedírselo a la organización
        que lo emitió.
      </p>

      <h2>Responsabilidad de quienes emiten certificados</h2>
      <p>
        Las organizaciones y personas que envían certificados deciden quién los recibe y qué dicen, y deben tener
        derecho a usar los nombres y correos de sus destinatarios con este fin. SendCert no está dirigido a menores;
        cuando se emiten certificados a menores de edad, quien los emite es responsable de contar con el
        consentimiento necesario.
      </p>

      <h2>Cambios</h2>
      <p>
        Si cambiamos esta política, actualizaremos esta página y la fecha de arriba. Consulta también nuestros{' '}
        <Link href={localizePath('/terms', 'es')}>términos del servicio</Link>.
      </p>
    </>
  );
}
