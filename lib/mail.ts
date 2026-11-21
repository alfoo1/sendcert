import nodemailer from 'nodemailer';

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
  // Public verification page for this certificate (signed-in senders only).
  verifyUrl?: string;
  // The sender's own address for replies; falls back to SMTP_REPLY_TO.
  replyTo?: string;
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

const FOOTER_URL = withUtm(`${SITE_URL}/`, 'certificate_email', 'recipient_footer');

function renderHtml(message: MailMessage): string {
  const body = escapeHtml(message.body).replace(/\n/g, '<br/>');
  const isCertificate = Boolean(message.attachments?.length);
  const attachmentName = message.attachments?.[0]?.filename ?? 'certificate.pdf';

  const certificateCard = isCertificate
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:#f5f5ff;border:1px solid #e0e0ff;border-radius:10px;">
        <tr><td style="padding:18px 20px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Your certificate is attached</p>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${escapeHtml(attachmentName)}</p>
          ${
            message.verifyUrl
              ? `<a href="${escapeHtml(message.verifyUrl)}" style="display:inline-block;margin-top:14px;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">View and verify online</a>
                 <p style="margin:10px 0 0;font-size:12px;line-height:18px;color:#6b7280;">Share this link on LinkedIn or with an employer so anyone can confirm the certificate is real.</p>`
              : ''
          }
        </td></tr>
      </table>`
    : '';

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;">
        <tr><td style="padding:32px;font-size:15px;line-height:24px;color:#1f2937;">
          ${body}
          ${certificateCard}
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#9ca3af;">
        Sent with <a href="${escapeHtml(FOOTER_URL)}" style="color:#6b7280;">SendCert</a> · Create and send certificates for free
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function renderText(message: MailMessage): string {
  const verifyLine = message.verifyUrl
    ? `\n\nView and verify your certificate online: ${message.verifyUrl}`
    : '';
  return `${message.body}${verifyLine}\n\n—\nSent with SendCert · Create and send certificates for free: ${FOOTER_URL}`;
}

/**
 * Sends one email with an HTML layout plus a plain-text alternative.
 */
export async function sendMail(
  transporter: nodemailer.Transporter,
  cfg: ServerSmtpConfig,
  message: MailMessage,
) {
  return transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to: message.to,
    subject: message.subject,
    text: renderText(message),
    html: renderHtml(message),
    attachments: message.attachments,
    ...(message.replyTo || cfg.replyTo ? { replyTo: message.replyTo || cfg.replyTo } : {}),
  });
}
