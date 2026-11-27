import type { Locale } from '@/lib/i18n';
import { formatEventDate, hashtagText } from '@/lib/eventMode/format';
import type { EventRecord } from '@/lib/eventMode/types';
import type { ShareCardEvent } from '@/components/events/ShareCardMaker';

/** What the share card needs from an event (Level 0, or Level 2 with its design). */
export function shareCardEvent(e: EventRecord, locale: Locale): ShareCardEvent {
  const sc = e.shareCard;
  const design =
    sc.level === 2 && sc.background?.url && sc.zones
      ? { backgroundUrl: sc.background.url, bgSize: { w: sc.background.w, h: sc.background.h }, zones: sc.zones }
      : null;
  return {
    name: e.name,
    dateLine: [formatEventDate(e, locale, 'short'), e.venue].filter(Boolean).join(' · ') || null,
    organizer: e.organizerName,
    hashtag: hashtagText(e.hashtag),
    accent: e.accentColor,
    style: e.style,
    logoUrl: e.logoUrl,
    partnerLogoUrls: e.partnerLogos.map((p) => p.url),
    design,
  };
}
