import { tx, type Locale } from '@/lib/i18n';
import { formatEventDate, formatEventTime } from '@/lib/eventMode/format';
import { personalLink, unsubscribeLink } from '@/lib/eventMode/links';
import type { EventRecipient, EventRecord } from '@/lib/eventMode/types';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sendcert.org').replace(/\/$/, '');

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Replaces {{name}} and {{link}} in the organizer's text. */
export function fillInvite(template: string, name: string, link: string): string {
  return template.replace(/\{\{\s*name\s*\}\}/gi, name).replace(/\{\{\s*link\s*\}\}/gi, link);
}

/**
 * Invitation email sent through SendCert: the organizer's message, a big
 * "Answer" button to the personal page, and an unsubscribe link that is
 * separate from declining (also as List-Unsubscribe one-click headers).
 */
export function buildInviteEmail(
  event: EventRecord,
  person: EventRecipient,
  subjectTemplate: string,
  bodyTemplate: string,
): { subject: string; text: string; html: string; headers: Record<string, string>; fromName: string } {
  const locale: Locale = event.locale;
  const t = (en: string, es: string) => tx(locale, { en, es });
  const link = personalLink(person.token);
  const unsub = unsubscribeLink(person.token);
  const subject = fillInvite(subjectTemplate, person.name, link);
  const body = fillInvite(bodyTemplate, person.name, link);
  const when = [formatEventDate(event, locale), formatEventTime(event, locale)].filter(Boolean).join(' · ');
  const where = [event.venue, event.address].filter(Boolean).join(', ');
  const organizer = event.organizerName ?? 'SendCert';
  const footer = t(
    `You received this because ${organizer} invited you to ${event.name}.`,
    `Recibiste este correo porque ${organizer} te invitó a ${event.name}.`,
  );

  const text = `${body}\n\n${t('Answer here', 'Responde aquí')}: ${link}\n\n—\n${footer}\n${t('Unsubscribe from emails', 'Darte de baja de los correos')}: ${unsub}`;
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:22px;color:#374151;">${esc(p).replace(/\n/g, '<br>').replace(esc(link), `<a href="${link}" style="color:${event.accentColor};">${esc(link)}</a>`)}</p>`)
    .join('');
  const html = `<!doctype html>
<html lang="${locale}"><body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="height:6px;background:${event.accentColor};"></td></tr>
      <tr><td style="padding:28px 32px 8px;text-align:center;">
        ${event.logoUrl && !event.logoUrl.startsWith('data:') ? `<img src="${esc(event.logoUrl)}" alt="${esc(organizer)}" style="max-height:56px;max-width:200px;">` : `<p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${event.accentColor};">${esc(organizer)}</p>`}
        <h1 style="margin:16px 0 6px;font-size:24px;line-height:30px;color:#111827;">${esc(event.name)}</h1>
        ${when ? `<p style="margin:0;font-size:14px;color:#4b5563;">${esc(when)}</p>` : ''}
        ${where ? `<p style="margin:4px 0 0;font-size:14px;color:#4b5563;">${esc(where)}</p>` : ''}
      </td></tr>
      <tr><td style="padding:20px 32px 4px;">${paragraphs}</td></tr>
      <tr><td style="padding:4px 32px 28px;text-align:center;">
        <a href="${link}" style="display:inline-block;background:${event.accentColor};color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:10px;">${esc(t("I'll be there / I can't make it", 'Voy / No puedo ir'))}</a>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;max-width:560px;font-size:12px;line-height:18px;color:#9ca3af;">${esc(footer)}<br>
      <a href="${unsub}" style="color:#6b7280;">${esc(t('Unsubscribe from emails', 'Darte de baja de los correos'))}</a> · <a href="${SITE_URL}" style="color:#6b7280;">SendCert</a></p>
  </td></tr></table>
</body></html>`;

  return {
    subject,
    text,
    html,
    fromName: `${organizer} via SendCert`,
    headers: {
      'List-Unsubscribe': `<${SITE_URL}/api/e/${person.token}/unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}
