import { describe, expect, it } from 'vitest';
import { defaultPostText, hashtagText, zonedTimeToUtc } from '@/lib/eventMode/format';
import type { EventRecord } from '@/lib/eventMode/types';

describe('event time zones', () => {
  it('converts wall-clock time in the event time zone to UTC', () => {
    // GovCon-style: 9:00 AM in Washington in December (EST, UTC-5).
    expect(zonedTimeToUtc('2026-12-11', '09:00', 'America/New_York').toISOString()).toBe('2026-12-11T14:00:00.000Z');
    // Buenos Aires has no DST (UTC-3).
    expect(zonedTimeToUtc('2026-07-01', '18:30', 'America/Argentina/Buenos_Aires').toISOString()).toBe('2026-07-01T21:30:00.000Z');
    // Summer time in New York (EDT, UTC-4).
    expect(zonedTimeToUtc('2026-06-15', '09:00', 'America/New_York').toISOString()).toBe('2026-06-15T13:00:00.000Z');
  });
});

describe('post text', () => {
  const event = {
    name: 'GovCon 360',
    eventDate: '2026-12-11',
    eventTime: '09:00',
    timezone: 'America/New_York',
    venue: 'Convention Center',
    organizerName: 'GovCon Group',
    hashtag: 'GovCon360',
    eventUrl: 'https://example.com/govcon',
  } as EventRecord;

  it('normalizes hashtags', () => {
    expect(hashtagText('GovCon360')).toBe('#GovCon360');
    expect(hashtagText('##Gov Con')).toBe('#GovCon');
    expect(hashtagText('  ')).toBeNull();
  });

  it('includes event, venue, organizer, link and hashtag', () => {
    const text = defaultPostText(event, 'en', 'before');
    expect(text).toContain("I'll be at GovCon 360");
    expect(text).toContain('at Convention Center');
    expect(text).toContain('Hosted by GovCon Group');
    expect(text).toContain('https://example.com/govcon');
    expect(text).toContain('#GovCon360');
  });
});
