import nodemailer from 'nodemailer';
import { tx, type Locale } from './i18n';

export { isValidEmail } from './validation';

// Server-side SMTP config read from environment — never user-provided.
// This keeps credentials out of the browser and lets SendCert brand every email.
export type ServerSmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  // Optional Reply-To. When set, recipients' replies land at this address
  // instead of the branded from-address (which may not accept inbound mail).
  replyTo?: string;
};

export type MailMessage = {
  to: string;
  subject: string;
  body: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
  // Public verification page for this certificate, when verification is on.
  verifyUrl?: string;
  verifyId?: string;
  // "Add to LinkedIn" button (goes through /verify/[id]/linkedin).
  linkedInUrl?: string;
  // Test sends: show the verification card with sample links and a note.
  previewVerification?: boolean;
  // Language of the card, footer and plain-text extras (the body is the sender's).
  locale?: Locale;
  // The sender's own address for replies; falls back to SMTP_REPLY_TO.
  replyTo?: string;
  // Event emails: "<Organizer> via SendCert" as the sender name, their own
  // HTML/text (instead of the certificate layout) and extra headers such as
  // List-Unsubscribe.
  fromName?: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
};

/**
 * Reads SMTP config from environment. Throws if essential values are missing
 * so the API route can short-circuit with a clear error instead of timing out.
 */
export function loadSmtpConfigFromEnv(): ServerSmtpConfig {
  const host = process.env.SMTP_HOST ?? '';
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER ?? '';
  const pass = process.env.SMTP_PASS ?? '';
  const fromName = process.env.SMTP_FROM_NAME ?? 'SendCert';
  const fromEmail = process.env.SMTP_FROM_EMAIL ?? user;
  const replyTo = process.env.SMTP_REPLY_TO?.trim() || undefined;

  if (!host || !user || !pass) {
    throw new Error(
      'Server SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in .env.local.',
    );
  }
  return { host, port, user, pass, fromName, fromEmail, replyTo };
}

/**
 * Transporter factory — reuse for many sends within one request.
 * Port 465 uses implicit TLS; 587 uses STARTTLS.
 */
export function createTransporter(cfg: ServerSmtpConfig) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

/**
 * Substitutes template variables. Only {{name}} for now.
 */
export function renderTemplate(template: string, vars: { name: string }): string {
  return template.replace(/\{\{\s*name\s*\}\}/g, vars.name);
}

// The body is user-written text; escape it so it can't inject HTML into
// emails sent from our domain.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sendcert.org').replace(/\/$/, '');

/** Adds UTM tags so visits coming from our emails show up in analytics. */
export function withUtm(url: string, source: string, campaign: string): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', 'email');
  u.searchParams.set('utm_campaign', campaign);
  return u.toString();
}

export function verifyUrlFor(verifyId: string): string {
  return withUtm(`${SITE_URL}/verify/${verifyId}`, 'certificate_email', 'verify_link');
}

/** Our own redirect to LinkedIn, so clicks can be counted. */
export function linkedInRedirectFor(
  verifyId: string,
  type: 'add' | 'share',
  from: 'email' | 'page',
): string {
  return `${SITE_URL}/verify/${verifyId}/linkedin?type=${type}&from=${from}`;
}

function footerUrl(locale: Locale): string {
  return withUtm(`${SITE_URL}${locale === 'es' ? '/es' : '/'}`, 'certificate_email', 'recipient_footer');
}

function sampleVerifyUrl(locale: Locale): string {
  return `${SITE_URL}${locale === 'es' ? '/es' : '/'}#verification`;
}

// Strings of the certificate card and footer, per language.
const COPY = {
  viewVerify: { en: 'View &amp; verify', es: 'Ver y verificar' },
  addLinkedIn: { en: 'Add to LinkedIn', es: 'Agregar a LinkedIn' },
  verifiedLabel: { en: '&#10003; Verified certificate', es: '&#10003; Certificado verificado' },
  attached: { en: 'Your certificate is attached', es: 'Tu certificado está adjunto' },
  certificateId: { en: 'Certificate ID', es: 'ID del certificado' },
  explainer: {
    en: 'Anyone can confirm this certificate is genuine at its verification page. Add it to your LinkedIn profile in one click.',
    es: 'Cualquier persona puede confirmar que este certificado es auténtico en su página de verificación. Agrégalo a tu perfil de LinkedIn con un clic.',
  },
  testNote: {
    en: 'This is a test. In the real send, each recipient gets their own ID and these buttons open their verification page.',
    es: 'Esto es una prueba. En el envío real, cada persona recibe su propio ID y estos botones abren su página de verificación.',
  },
  sentWith: { en: 'Sent with', es: 'Enviado con' },
  tagline: {
    en: 'Free, verifiable certificates for everyone',
    es: 'Certificados verificables y gratis para todos',
  },
  textVerified: { en: 'Verified certificate', es: 'Certificado verificado' },
  textLinkedIn: { en: 'Add it to your LinkedIn profile', es: 'Agrégalo a tu perfil de LinkedIn' },
};

function renderHtml(input: MailMessage): string {
  // A test send has no real verification page yet: show the same card with
  // sample links so the sender sees what recipients will get.
  const locale: Locale = input.locale ?? 'en';
  const t = (c: { en: string; es: string }) => tx(locale, c);
  const sample = sampleVerifyUrl(locale);
  const message: MailMessage = input.previewVerification
    ? { ...input, verifyUrl: sample, linkedInUrl: sample, verifyId: 'CERT-2026-XXXX-XXXX' }
    : input;
  const body = escapeHtml(message.body).replace(/\n/g, '<br/>');
  const isCertificate = Boolean(message.attachments?.length);
  const attachmentName = message.attachments?.[0]?.filename ?? 'certificate.pdf';

  const verified = isCertificate && message.verifyUrl;
  const buttons = verified
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr>
          <td style="padding:0 8px 8px 0;"><a href="${escapeHtml(message.verifyUrl!)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 16px;border-radius:8px;">${t(COPY.viewVerify)}</a></td>
          ${
            message.linkedInUrl
              ? `<td style="padding:0 0 8px 0;"><a href="${escapeHtml(message.linkedInUrl)}" style="display:inline-block;background:#ffffff;color:#0a66c2;text-decoration:none;font-size:14px;font-weight:600;padding:9px 15px;border-radius:8px;border:1px solid #0a66c2;">${t(COPY.addLinkedIn)}</a></td>`
              : ''
          }
        </tr></table>`
    : '';

  const certificateCard = isCertificate
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
        <tr><td style="padding:20px 22px;">
          ${
            verified
              ? `<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#047857;">${t(COPY.verifiedLabel)}</p>`
              : ''
          }
          <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${t(COPY.attached)}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${escapeHtml(attachmentName)}</p>
          ${
            verified && message.verifyId
              ? `<p style="margin:10px 0 0;font-size:12px;color:#6b7280;">${t(COPY.certificateId)} <span style="font-family:Menlo,Consolas,monospace;color:#374151;">${escapeHtml(message.verifyId)}</span></p>`
              : ''
          }
          ${buttons}
          ${
            verified
              ? `<p style="margin:4px 0 0;font-size:12px;line-height:18px;color:#6b7280;">${t(COPY.explainer)}</p>`
              : ''
          }
          ${
            input.previewVerification
              ? `<p style="margin:10px 0 0;font-size:12px;line-height:18px;color:#b45309;">${t(COPY.testNote)}</p>`
              : ''
          }
        </td></tr>
      </table>`
    : '';

  return `<!doctype html>
<html lang="${locale}"><body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;">
        <tr><td style="padding:32px;font-size:15px;line-height:24px;color:#1f2937;">
          ${body}
          ${certificateCard}
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#9ca3af;">
        ${t(COPY.sentWith)} <a href="${escapeHtml(footerUrl(locale))}" style="color:#6b7280;">SendCert</a> · ${t(COPY.tagline)}
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function renderText(message: MailMessage): string {
  const locale: Locale = message.locale ?? 'en';
  const t = (c: { en: string; es: string }) => tx(locale, c);
  const verifyLine = message.verifyUrl
    ? `\n\n${t(COPY.textVerified)}${message.verifyId ? ` (ID ${message.verifyId})` : ''}: ${message.verifyUrl}` +
      (message.linkedInUrl ? `\n${t(COPY.textLinkedIn)}: ${message.linkedInUrl}` : '')
    : '';
  return `${message.body}${verifyLine}\n\n—\n${t(COPY.sentWith)} SendCert · ${t(COPY.tagline)}: ${footerUrl(locale)}`;
}

/**
 * Sends one email with an HTML layout plus a plain-text alternative.
 */
export async function sendMail(
  transporter: nodemailer.Transporter,
  cfg: ServerSmtpConfig,
  message: MailMessage,
) {
  const fromName = (message.fromName ?? cfg.fromName).replace(/["<>]/g, '');
  return transporter.sendMail({
    from: `"${fromName}" <${cfg.fromEmail}>`,
    to: message.to,
    subject: message.subject,
    text: message.text ?? renderText(message),
    html: message.html ?? renderHtml(message),
    attachments: message.attachments,
    ...(message.headers ? { headers: message.headers } : {}),
    ...(message.replyTo || cfg.replyTo ? { replyTo: message.replyTo || cfg.replyTo } : {}),
  });
}
