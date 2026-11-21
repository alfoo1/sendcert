import { createTransporter, loadSmtpConfigFromEnv, sendMail } from '@/lib/mail';

const OWNER_EMAIL =
  process.env.OWNER_NOTIFICATION_EMAIL ?? 'aguileras.alfonso@gmail.com';

/** Emails the site owner (feedback, waitlist signups). Throws on SMTP failure. */
export async function notifyOwner(subject: string, body: string): Promise<void> {
  const smtp = loadSmtpConfigFromEnv();
  await sendMail(createTransporter(smtp), smtp, { to: OWNER_EMAIL, subject, body });
}
