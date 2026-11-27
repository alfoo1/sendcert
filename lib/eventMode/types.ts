import type { Locale } from '@/lib/i18n';
import type { RelBox, RelCircle } from '@/lib/shareCard/geometry';
import type { Rsvp } from '@/lib/eventMode/logic';

export type PartnerLogo = { url: string; name?: string };

export type TextZone = RelBox & {
  font: 'sans' | 'serif';
  color: string;
  align: 'left' | 'center' | 'right';
};

/** Share card settings stored on the event (events.share_card). */
export type ShareCardSettings = {
  // 0 = auto from event data, 1 = customized template (PR B), 2 = own background.
  level?: 0 | 1 | 2;
  // Level 2: the organizer's background and the two zones on it.
  background?: { url: string; w: number; h: number } | null;
  zones?: { photo: RelCircle; text: TextZone } | null;
};

export type EventRecord = {
  id: string;
  ownerId: string;
  createdAt: string;
  locale: Locale;
  name: string;
  eventDate: string | null; // YYYY-MM-DD in the event's time zone
  eventTime: string | null; // HH:MM
  timezone: string; // IANA
  venue: string | null;
  address: string | null;
  organizerName: string | null;
  logoUrl: string | null;
  accentColor: string;
  hashtag: string | null;
  eventUrl: string | null;
  partnerLogos: PartnerLogo[];
  style: string;
  replyTo: string | null;
  inviteSubject: string | null;
  inviteBody: string | null;
  shareCard: ShareCardSettings;
};

/** Fields the organizer edits (create/update). */
export type EventInput = Omit<EventRecord, 'id' | 'ownerId' | 'createdAt'>;

export type EventRecipient = {
  id: string;
  eventId: string;
  token: string;
  name: string;
  email: string;
  createdAt: string;
  rsvp: Rsvp;
  rsvpReason: string | null;
  respondedAt: string | null;
  invitedAt: string | null;
  // Unsubscribed from this organizer's emails (any of their events).
  unsubscribed: boolean;
  attended: boolean | null;
  verifyId: string | null;
};
