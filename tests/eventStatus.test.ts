import { describe, expect, it } from 'vitest';
import {
  accept,
  bucketOf,
  canEmail,
  countStatuses,
  decline,
  isAttendee,
  postEventTargets,
  splitByDailyCap,
  unsubscribe,
  type RecipientState,
} from '@/lib/events/logic';

const fresh: RecipientState = { rsvp: 'pending', unsubscribed: false, attended: null };

describe('decline vs unsubscribe', () => {
  it('"I can\'t make it" marks not attending but keeps emails on', () => {
    const s = decline(fresh);
    expect(s.rsvp).toBe('no');
    expect(s.unsubscribed).toBe(false);
    expect(canEmail(s)).toBe(true);
    expect(bucketOf(s)).toBe('not_coming');
  });

  it('unsubscribing stops emails but keeps the attendance answer', () => {
    const coming = unsubscribe(accept(fresh));
    expect(coming.rsvp).toBe('yes');
    expect(canEmail(coming)).toBe(false);
    expect(bucketOf(coming)).toBe('coming');

    const silent = unsubscribe(fresh);
    expect(silent.rsvp).toBe('pending');
    expect(bucketOf(silent)).toBe('no_answer');
  });

  it('declining after unsubscribing does not re-subscribe', () => {
    expect(decline(unsubscribe(fresh)).unsubscribed).toBe(true);
  });

  it('counts buckets and unsubscribes separately', () => {
    const list = [accept(fresh), decline(fresh), fresh, unsubscribe(accept(fresh)), unsubscribe(fresh)];
    expect(countStatuses(list)).toEqual({ total: 5, coming: 2, notComing: 1, noAnswer: 2, unsubscribed: 2 });
  });
});

describe('attendee filtering for post-event sends', () => {
  type R = RecipientState & { id: string };
  const r = (id: string, s: Partial<RecipientState>): R => ({ id, ...fresh, ...s });

  it('defaults attendance to "I\'ll be there" until the organizer marks it', () => {
    expect(isAttendee(r('a', { rsvp: 'yes' }))).toBe(true);
    expect(isAttendee(r('b', { rsvp: 'no' }))).toBe(false);
    expect(isAttendee(r('c', { rsvp: 'pending' }))).toBe(false);
  });

  it("the organizer's mark wins over the answer", () => {
    expect(isAttendee(r('a', { rsvp: 'yes', attended: false }))).toBe(false);
    expect(isAttendee(r('b', { rsvp: 'no', attended: true }))).toBe(true);
    expect(isAttendee(r('c', { rsvp: 'pending', attended: true }))).toBe(true);
  });

  it('emails only attendees who have not unsubscribed; the rest get the link only', () => {
    const list = [
      r('yes', { rsvp: 'yes' }),
      r('walk-in', { rsvp: 'pending', attended: true }),
      r('no-show', { rsvp: 'yes', attended: false }),
      r('declined', { rsvp: 'no' }),
      r('unsub-attendee', { rsvp: 'yes', unsubscribed: true }),
    ];
    const { email, linkOnly } = postEventTargets(list);
    expect(email.map((x) => x.id)).toEqual(['yes', 'walk-in']);
    expect(linkOnly.map((x) => x.id)).toEqual(['unsub-attendee']);
  });
});

describe('daily sending cap', () => {
  it('sends what fits today and leaves the rest for later', () => {
    expect(splitByDailyCap(65, 100)).toEqual({ now: 65, later: 0 });
    expect(splitByDailyCap(150, 100)).toEqual({ now: 100, later: 50 });
    expect(splitByDailyCap(40, 0)).toEqual({ now: 0, later: 40 });
    expect(splitByDailyCap(10, -5)).toEqual({ now: 0, later: 10 });
  });
});
