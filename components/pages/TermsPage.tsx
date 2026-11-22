import Link from 'next/link';
import DocShell from '@/components/pages/DocShell';
import { localizePath, type Locale } from '@/lib/i18n';

export const TERMS_COPY = {
  title: { en: 'Terms of Service', es: 'Términos del servicio' },
  description: {
    en: 'The rules for using SendCert to create, send and verify certificates.',
    es: 'Las reglas para usar SendCert para crear, enviar y verificar certificados.',
  },
};

const UPDATED = { en: 'Last updated: November 21, 2026', es: 'Última actualización: 21 de noviembre de 2026' };

/** /terms and /es/terminos. Keep both languages in sync. */
export default function TermsPage({ locale }: { locale: Locale }) {
  return (
    <DocShell locale={locale} enPath="/terms">
      <h1>{TERMS_COPY.title[locale]}</h1>
      <p className="text-sm text-gray-500">{UPDATED[locale]}</p>
      {locale === 'es' ? <TermsEs /> : <TermsEn />}
    </DocShell>
  );
}

function TermsEn() {
  return (
    <>
      <p>
        By using SendCert (sendcert.org, including its connector for AI assistants) you agree to these terms. If you
        don&apos;t agree, please don&apos;t use the service.
      </p>

      <h2>The service</h2>
      <p>
        SendCert lets you design certificates, generate a personalized PDF for each recipient, email it, and publish a
        verification page for each certificate. The free plan currently allows 100 certificates a month without an
        account and 300 with a free account. We may change features and limits, and we&apos;ll show current limits in
        the app.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Only issue certificates you are entitled to issue, on behalf of an organization you represent.</li>
        <li>Only send to people who expect to receive the certificate. Don&apos;t use SendCert for spam or advertising.</li>
        <li>
          Don&apos;t create false or misleading credentials, impersonate other institutions or use logos and names you
          don&apos;t have the right to use.
        </li>
        <li>
          You are responsible for the content of your certificates and emails, and for having the right to use your
          recipients&apos; names and email addresses.
        </li>
        <li>Don&apos;t try to get around the limits, disrupt the service or access data that isn&apos;t yours.</li>
      </ul>

      <h2>Verification pages</h2>
      <p>
        Every certificate gets a public verification page showing the recipient&apos;s name, the credential, the issuer
        and the dates. By sending certificates you accept that this information is public. We can remove a page at the
        request of the issuer or the recipient, or if it breaks these terms.
      </p>

      <h2>AI assistants</h2>
      <p>
        When you use SendCert from an AI assistant, the assistant prepares a draft that you must review on sendcert.org
        before sending. You are responsible for what you send, even if an assistant wrote it.
      </p>

      <h2>Suspension</h2>
      <p>
        We may block sends, remove content or suspend access when we reasonably believe these terms are being broken or
        the service is being abused.
      </p>

      <h2>No warranty</h2>
      <p>
        SendCert is provided &quot;as is&quot;, without warranties of any kind. We work to keep it reliable, but we
        can&apos;t guarantee that every email will be delivered or that the service will always be available. To the
        extent permitted by law, we are not liable for indirect damages or for losses arising from using or not being
        able to use the service.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms; the date above shows the latest version. Read how we handle data in our{' '}
        <Link href={localizePath('/privacy', 'en')}>privacy policy</Link>. Questions:{' '}
        <a href="mailto:hola@sendcert.org">hola@sendcert.org</a>.
      </p>
    </>
  );
}

function TermsEs() {
  return (
    <>
      <p>
        Al usar SendCert (sendcert.org, incluido su conector para asistentes de IA) aceptas estos términos. Si no estás de
        acuerdo, por favor no uses el servicio.
      </p>

      <h2>El servicio</h2>
      <p>
        SendCert te permite diseñar certificados, generar un PDF personalizado para cada destinatario, enviarlo por
        correo y publicar una página de verificación para cada certificado. Hoy el plan gratuito permite 100
        certificados al mes sin cuenta y 300 con una cuenta gratuita. Podemos cambiar funciones y límites, y siempre
        mostraremos los límites vigentes en la app.
      </p>

      <h2>Tus responsabilidades</h2>
      <ul>
        <li>Emite solo certificados que tengas derecho a emitir, en nombre de una organización que representes.</li>
        <li>
          Envía solo a personas que esperan recibir el certificado. No uses SendCert para spam ni publicidad.
        </li>
        <li>
          No crees credenciales falsas o engañosas, no te hagas pasar por otras instituciones ni uses logos o nombres
          que no tengas derecho a usar.
        </li>
        <li>
          Eres responsable del contenido de tus certificados y correos, y de tener derecho a usar los nombres y correos
          de tus destinatarios.
        </li>
        <li>No intentes evadir los límites, afectar el funcionamiento del servicio ni acceder a datos ajenos.</li>
      </ul>

      <h2>Páginas de verificación</h2>
      <p>
        Cada certificado tiene una página de verificación pública que muestra el nombre de quien lo recibe, la
        credencial, quién la emite y las fechas. Al enviar certificados aceptas que esa información sea pública.
        Podemos dar de baja una página si lo pide quien emitió el certificado o quien lo recibió, o si incumple estos
        términos.
      </p>

      <h2>Asistentes de IA</h2>
      <p>
        Cuando usas SendCert desde un asistente de IA, el asistente prepara un borrador que debes revisar en
        sendcert.org antes de enviarlo. Eres responsable de lo que envías, aunque lo haya escrito un asistente.
      </p>

      <h2>Suspensión</h2>
      <p>
        Podemos bloquear envíos, eliminar contenido o suspender el acceso cuando tengamos motivos razonables para creer
        que se incumplen estos términos o que se está abusando del servicio.
      </p>

      <h2>Sin garantías</h2>
      <p>
        SendCert se ofrece &quot;tal cual&quot;, sin garantías de ningún tipo. Trabajamos para que funcione bien, pero no
        podemos garantizar que todos los correos lleguen ni que el servicio esté siempre disponible. En la medida en
        que lo permita la ley, no somos responsables por daños indirectos ni por pérdidas derivadas de usar o no poder
        usar el servicio.
      </p>

      <h2>Cambios y contacto</h2>
      <p>
        Podemos actualizar estos términos; la fecha de arriba indica la versión vigente. Lee cómo tratamos los datos en
        nuestra <Link href={localizePath('/privacy', 'es')}>política de privacidad</Link>. Preguntas:{' '}
        <a href="mailto:hola@sendcert.org">hola@sendcert.org</a>.
      </p>
    </>
  );
}
