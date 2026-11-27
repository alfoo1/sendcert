import type { Locale } from '@/lib/i18n';
import { formatEventDate, formatEventTime } from '@/lib/eventMode/format';
import type { EventRecord } from '@/lib/eventMode/types';

/**
 * Suggested invitation (subject and body) with {{name}} and {{link}}
 * placeholders, for mail merge from the organizer's own mailbox and as the
 * default for invites sent through SendCert.
 */
export function inviteText(e: EventRecord, locale: Locale): { subject: string; body: string } {
  const date = formatEventDate(e, locale);
  const time = formatEventTime(e, locale);
  const when = [date, time].filter(Boolean).join(locale === 'es' ? ', ' : ' at ');
  const where = [e.venue, e.address].filter(Boolean).join(', ');
  if (locale === 'es') {
    return {
      subject: `Invitación: ${e.name}`,
      body: [
        'Hola {{name}},',
        `Te invitamos a ${e.name}${when ? ` el ${when}` : ''}${where ? `, en ${where}` : ''}.`,
        '¿Vas a poder venir? Respóndenos con un clic en tu enlace personal: {{link}}',
        'Ahí también puedes agregarlo a tu calendario y armar tu tarjeta para compartir en LinkedIn.',
        `¡Te esperamos!${e.organizerName ? `\n${e.organizerName}` : ''}`,
      ].join('\n\n'),
    };
  }
  return {
    subject: `You're invited: ${e.name}`,
    body: [
      'Hi {{name}},',
      `You're invited to ${e.name}${when ? ` on ${when}` : ''}${where ? ` at ${where}` : ''}.`,
      'Will you be there? Let us know in one click with your personal link: {{link}}',
      'You can also add it to your calendar and make your card to share on LinkedIn.',
      `See you there!${e.organizerName ? `\n${e.organizerName}` : ''}`,
    ].join('\n\n'),
  };
}
