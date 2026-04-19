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

// Every outgoing email carries this small brand footer as plain text.
const FOOTER =
  '\n\n—\nSent with SendCert · Create and send your certificates for free at sendcert.org';

/**
 * Sends one email through the provided transporter with the SendCert footer.
 */
export async function sendMail(
  transporter: nodemailer.Transporter,
  cfg: ServerSmtpConfig,
  message: MailMessage,
) {
  const from = `"${cfg.fromName}" <${cfg.fromEmail}>`;
  const bodyWithFooter = message.body + FOOTER;

  return transporter.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    text: bodyWithFooter,
    html: bodyWithFooter.replace(/\n/g, '<br/>'),
    attachments: message.attachments,
    ...(cfg.replyTo ? { replyTo: cfg.replyTo } : {}),
  });
}
