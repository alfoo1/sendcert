// Pure rules for event recipients, shared by the server routes, the
// dashboard and the tests. No I/O here.

export type Rsvp = 'pending' | 'yes' | 'no';

export type RecipientState = {
  rsvp: Rsvp;
  // "Unsubscribe from emails" (CAN-SPAM). Independent from the answer.
  unsubscribed: boolean;
  // Post-event attendance marked by the organizer; null = not marked yet.
  attended: boolean | null;
};

/** "I'll be there". Never touches the email subscription. */
export function accept(state: RecipientState): RecipientState {
  return { ...state, rsvp: 'yes' };
}

/** "I can't make it": not attending, but still subscribed to emails. */
export function decline(state: RecipientState): RecipientState {
  return { ...state, rsvp: 'no' };
}

/** "Unsubscribe from emails": keeps the attendance answer as it was. */
export function unsubscribe(state: RecipientState): RecipientState {
  return { ...state, unsubscribed: true };
}

export function canEmail(state: Pick<RecipientState, 'unsubscribed'>): boolean {
  return !state.unsubscribed;
}

export type Bucket = 'coming' | 'not_coming' | 'no_answer';

export function bucketOf(state: Pick<RecipientState, 'rsvp'>): Bucket {
  if (state.rsvp === 'yes') return 'coming';
  if (state.rsvp === 'no') return 'not_coming';
  return 'no_answer';
}

export type StatusCounts = {
  total: number;
  coming: number;
  notComing: number;
  noAnswer: number;
  // Overlaps with the three above: someone can be coming and unsubscribed.
  unsubscribed: number;
};

export function countStatuses(list: Pick<RecipientState, 'rsvp' | 'unsubscribed'>[]): StatusCounts {
  const counts: StatusCounts = { total: list.length, coming: 0, notComing: 0, noAnswer: 0, unsubscribed: 0 };
  for (const r of list) {
    const bucket = bucketOf(r);
    if (bucket === 'coming') counts.coming += 1;
    else if (bucket === 'not_coming') counts.notComing += 1;
    else counts.noAnswer += 1;
    if (r.unsubscribed) counts.unsubscribed += 1;
  }
  return counts;
}

/** Attended the event: the organizer's mark, or "I'll be there" by default. */
export function isAttendee(state: Pick<RecipientState, 'rsvp' | 'attended'>): boolean {
  return state.attended ?? state.rsvp === 'yes';
}

/**
 * Who gets the post-event email (certificate, "I attended" card, survey):
 * attendees who haven't unsubscribed. Unsubscribed attendees still get their
 * certificate through their personal link, just no email.
 */
export function postEventTargets<T extends RecipientState>(list: T[]): { email: T[]; linkOnly: T[] } {
  const attendees = list.filter(isAttendee);
  return {
    email: attendees.filter(canEmail),
    linkOnly: attendees.filter((r) => !canEmail(r)),
  };
}

/**
 * Splits a send by the email provider's daily cap: how many go out now and
 * how many are left for the next day(s).
 */
export function splitByDailyCap(pending: number, remainingToday: number): { now: number; later: number } {
  const now = Math.max(0, Math.min(pending, remainingToday));
  return { now, later: pending - now };
}
