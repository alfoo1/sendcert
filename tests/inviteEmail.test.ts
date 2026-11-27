import { describe, expect, it } from 'vitest';
import { buildInviteEmail, fillInvite } from '@/lib/eventMode/inviteEmail';
import { inviteText } from '@/lib/eventMode/invite';
import type { EventRecipient, EventRecord } from '@/lib/eventMode/types';

const event = {
  id: 'e1',
  ownerId: 'o1',
  createdAt: '',
  locale: 'en',
  name: 'GovCon 360',
  eventDate: '2026-12-11',
  eventTime: '09:00',
  timezone: 'America/New_York',
  venue: 'Convention Center',
  address: null,
  organizerName: 'GovCon Group',
  logoUrl: null,
  accentColor: '#1e3a5f',
  hashtag: 'GovCon360',
  eventUrl: null,
  partnerLogos: [],
  style: 'elegant',
  replyTo: 'organizer@example.com',
  inviteSubject: null,
  inviteBody: null,
  shareCard: {},
} as EventRecord;

const person = { id: 'r1', token: 'AbCdEfGhIjKlMnOpQrStUv', name: 'Jane <Doe>', email: 'jane@example.com' } as EventRecipient;

describe('invite email', () => {
  it('fills {{name}} and {{link}}', () => {
    expect(fillInvite('Hi {{name}}, answer at {{ link }}', 'Jane', 'https://x/e/t')).toBe('Hi Jane, answer at https://x/e/t');
  });

  it('links to the personal page and has a separate one-click unsubscribe', () => {
    const { subject, body } = inviteText(event, 'en');
    const mail = buildInviteEmail(event, person, subject, body);
    expect(mail.fromName).toBe('GovCon Group via SendCert');
    expect(mail.subject).toBe("You're invited: GovCon 360");
    expect(mail.text).toContain('/e/AbCdEfGhIjKlMnOpQrStUv');
    expect(mail.text).toContain('/e/AbCdEfGhIjKlMnOpQrStUv/unsubscribe');
    expect(mail.html).toContain('/e/AbCdEfGhIjKlMnOpQrStUv/unsubscribe');
    expect(mail.headers['List-Unsubscribe']).toContain('/api/e/AbCdEfGhIjKlMnOpQrStUv/unsubscribe');
    expect(mail.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    // Names are escaped in HTML.
    expect(mail.html).toContain('Jane &lt;Doe&gt;');
    expect(mail.html).not.toContain('Jane <Doe>');
  });
});
