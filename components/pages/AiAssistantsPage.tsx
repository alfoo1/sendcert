import Link from 'next/link';
import DocShell from '@/components/pages/DocShell';
import { localizePath, tx, type Locale } from '@/lib/i18n';

export const MCP_URL = 'https://www.sendcert.org/mcp';

export const AI_PAGE_COPY = {
  title: {
    en: 'Send certificates from Claude, ChatGPT or Gemini',
    es: 'Envía certificados desde Claude, ChatGPT o Gemini',
  },
  description: {
    en: 'Connect SendCert to your AI assistant: share your attendee list, get a ready-to-send batch of personalized, verifiable certificates, review it and send. Free, no account needed.',
    es: 'Conecta SendCert a tu asistente de IA: comparte tu lista de asistentes, recibe los certificados personalizados y verificables listos para enviar, revísalos y envíalos. Gratis y sin cuenta.',
  },
};

/** Setup guide for the MCP server (/ai-assistants and /es/asistentes-ia). */
export default function AiAssistantsPage({ locale }: { locale: Locale }) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  const es = locale === 'es';

  return (
    <DocShell locale={locale} enPath="/ai-assistants">
      <p className="not-prose text-sm font-semibold uppercase tracking-wide text-brand-600">
        {t('AI assistants', 'Asistentes de IA')}
      </p>
      <h1>{tx(locale, AI_PAGE_COPY.title)}</h1>
      <p className="lead">{tx(locale, AI_PAGE_COPY.description)}</p>

      <p>{t('Connector URL (MCP server):', 'URL del conector (servidor MCP):')}</p>
      <pre>
        <code>{MCP_URL}</code>
      </pre>

      <h2>{t('How it works', 'Cómo funciona')}</h2>
      <ol>
        <li>
          {es
            ? 'Le pides a tu asistente algo como: "Prepara los certificados de participación del taller de Excel para las personas de esta planilla, firmados por Ana Pérez".'
            : 'Ask your assistant something like: "Prepare participation certificates for the Excel workshop for the people in this spreadsheet, signed by Ana Pérez."'}
        </li>
        <li>
          {t(
            'The assistant fills in the design, the texts, the recipient list and the email, and gives you a SendCert link.',
            'El asistente completa el diseño, los textos, la lista de destinatarios y el correo, y te da un enlace de SendCert.',
          )}
        </li>
        <li>
          {t(
            'You open the link, review everything and click Send. Each person gets a PDF with their name and a verification page.',
            'Abres el enlace, revisas todo y haces clic en Enviar. Cada persona recibe un PDF con su nombre y una página de verificación.',
          )}
        </li>
      </ol>
      <p>
        {t(
          'The assistant never sends anything by itself: emails only go out when you click Send on sendcert.org. The usual free limits apply: 100 certificates a month without an account and 300 with a free account.',
          'El asistente nunca envía nada por su cuenta: los correos solo salen cuando haces clic en Enviar en sendcert.org. Se aplican los límites gratuitos de siempre: 100 certificados al mes sin cuenta y 300 con una cuenta gratuita.',
        )}
      </p>

      <h2>{t('Set it up', 'Cómo conectarlo')}</h2>

      <h3>Claude</h3>
      <p>
        {t(
          'In Claude (web or desktop), open Settings → Connectors, choose "Add custom connector", name it SendCert and paste the URL above. No sign-in is needed. In Claude Code:',
          'En Claude (web o escritorio), abre Configuración → Conectores, elige "Agregar conector personalizado", ponle de nombre SendCert y pega la URL de arriba. No hace falta iniciar sesión. En Claude Code:',
        )}
      </p>
      <pre>
        <code>{`claude mcp add --transport http sendcert ${MCP_URL}`}</code>
      </pre>

      <h3>ChatGPT</h3>
      <p>
        {t(
          'Until SendCert is listed in the ChatGPT app directory, add it as a custom app: Settings → Apps → Advanced settings, turn on Developer mode, create an app with the URL above and choose "No authentication".',
          'Hasta que SendCert esté en el directorio de apps de ChatGPT, agrégalo como app personalizada: Configuración → Apps → Configuración avanzada, activa el Modo desarrollador, crea una app con la URL de arriba y elige "Sin autenticación".',
        )}
      </p>

      <h3>Gemini</h3>
      <p>
        {t(
          'In Gemini CLI, add SendCert to ~/.gemini/settings.json:',
          'En Gemini CLI, agrega SendCert a ~/.gemini/settings.json:',
        )}
      </p>
      <pre>
        <code>{`{
  "mcpServers": {
    "sendcert": { "httpUrl": "${MCP_URL}" }
  }
}`}</code>
      </pre>
      <p>
        {t(
          "The Gemini app doesn't accept custom connectors for everyone yet. We'll add SendCert as soon as it does.",
          'La app de Gemini todavía no acepta conectores personalizados para todo el mundo. Sumaremos SendCert apenas lo permita.',
        )}
      </p>

      <h3>{t('Other assistants and editors', 'Otros asistentes y editores')}</h3>
      <p>
        {t(
          'SendCert works with any MCP client that supports remote servers over Streamable HTTP (Cursor, VS Code, Windsurf and others). Add it as an HTTP server with the URL above and no authentication.',
          'SendCert funciona con cualquier cliente MCP que admita servidores remotos por Streamable HTTP (Cursor, VS Code, Windsurf y otros). Agrégalo como servidor HTTP con la URL de arriba y sin autenticación.',
        )}
      </p>

      <h2>{t('What the assistant can do', 'Qué puede hacer el asistente')}</h2>
      <ul>
        <li>
          <strong>{t('List templates', 'Ver plantillas')}</strong>
          {t(
            ': the six built-in designs with their default texts.',
            ': los seis diseños incluidos con sus textos predeterminados.',
          )}
        </li>
        <li>
          <strong>{t('Create a certificate draft', 'Crear un borrador de certificados')}</strong>
          {t(
            ': design, texts, up to 300 recipients and the email, ready for you to review. Draft links expire after 24 hours.',
            ': diseño, textos, hasta 300 destinatarios y el correo, listos para que los revises. Los enlaces de borrador vencen a las 24 horas.',
          )}
        </li>
        <li>
          <strong>{t('Verify a certificate', 'Verificar un certificado')}</strong>
          {es
            ? ': comprueba si un certificado emitido con SendCert es auténtico a partir de su ID (por ejemplo, CERT-2026-AB3K-9XQ2).'
            : ': checks whether a certificate issued with SendCert is genuine from its ID (for example, CERT-2026-AB3K-9XQ2).'}
        </li>
      </ul>

      <h2>{t('Example requests', 'Ejemplos de pedidos')}</h2>
      <ul>
        {es ? (
          <>
            <li>
              &quot;Adjunto la lista de asistentes del webinar de ayer. Prepara certificados de asistencia de la
              Fundación Horizonte, con la fecha de hoy.&quot;
            </li>
            <li>&quot;Haz certificados de finalización del curso de Python para estas 25 personas, con el diseño académico.&quot;</li>
            <li>&quot;¿Este certificado es válido? CERT-2026-AB3K-9XQ2&quot;</li>
          </>
        ) : (
          <>
            <li>
              &quot;Here is yesterday&apos;s webinar attendee list. Prepare attendance certificates from the Horizon
              Foundation, dated today.&quot;
            </li>
            <li>&quot;Make completion certificates for the Python course for these 25 people, using the academic design.&quot;</li>
            <li>&quot;Is this certificate valid? CERT-2026-AB3K-9XQ2&quot;</li>
          </>
        )}
      </ul>

      <h2>{t('Privacy', 'Privacidad')}</h2>
      <ul>
        <li>
          {t(
            'SendCert only receives what the assistant sends to its tools (texts and the recipient list), never your conversation.',
            'SendCert solo recibe lo que el asistente envía a sus herramientas (textos y lista de destinatarios), nunca tu conversación.',
          )}
        </li>
        <li>
          {t(
            'Drafts, including recipient emails, are deleted 24 hours after they are created.',
            'Los borradores, incluidos los correos de los destinatarios, se eliminan 24 horas después de crearse.',
          )}
        </li>
        <li>
          {t(
            'No account or sign-in is needed to use the connector.',
            'No necesitas cuenta ni iniciar sesión para usar el conector.',
          )}
        </li>
      </ul>
      <p>
        {t('Details in our ', 'Más detalles en nuestra ')}
        <Link href={localizePath('/privacy', locale)}>{t('privacy policy', 'política de privacidad')}</Link>
        {t('. Questions or problems: ', '. Preguntas o problemas: ')}
        <a href="mailto:hola@sendcert.org">hola@sendcert.org</a>.
      </p>
    </DocShell>
  );
}
