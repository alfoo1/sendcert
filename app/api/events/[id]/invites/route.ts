import { NextResponse, type NextRequest } from 'next/server';
import { getEventOwner } from '@/lib/eventMode/owner';
import { getEvent, listRecipients, markInvited, updateEvent } from '@/lib/eventMode/store';
import { splitByDailyCap } from '@/lib/eventMode/logic';
import { buildInviteEmail } from '@/lib/eventMode/inviteEmail';
import { inviteText } from '@/lib/eventMode/invite';
import { countDevSends, remainingToday } from '@/lib/eventMode/dailyCap';
import { createTransporter, loadSmtpConfigFromEnv, sendMail } from '@/lib/mail';
import { consumeUserQuota, logSend, USER_LIMIT } from '@/lib/quota';
import { errorMessage, logEvent } from '@/lib/events';
import type { EventRecipient, EventRecord } from '@/lib/eventMode/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** People who should get the invite: not invited yet and not unsubscribed. */
function pendingOf(people: EventRecipient[]): EventRecipient[] {
  return people.filter((p) => !p.invitedAt && !p.unsubscribed);
}

async function plan(ownerId: string, people: EventRecipient[]) {
  const pending = pendingOf(people);
  const [today, quota] = await Promise.all([remainingToday(), consumeUserQuota(ownerId, 0)]);
  const monthly = Math.max(0, quota.limit - quota.used);
  const { now, later } = splitByDailyCap(pending.length, Math.min(today, monthly));
  return {
    pending: pending.length,
    invited: people.filter((p) => p.invitedAt).length,
    unsubscribed: people.filter((p) => p.unsubscribed).length,
    remainingToday: today,
    monthlyRemaining: monthly,
    now,
    later,
  };
}

async function load(id: string) {
  const owner = await getEventOwner();
  if (!owner) return { error: NextResponse.json({ error: 'Sign in first.' }, { status: 401 }) };
  const event = await getEvent(owner.id, id);
  if (!event) return { error: NextResponse.json({ error: 'Event not found.' }, { status: 404 }) };
  return { owner, event };
}

/** What a send would do right now: how many go out today and how many wait. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const loaded = await load(params.id);
  if (loaded.error) return loaded.error;
  const people = await listRecipients(loaded.event);
  const defaults = inviteText(loaded.event, loaded.event.locale);
  return NextResponse.json({
    ...(await plan(loaded.owner.id, people)),
    subject: loaded.event.inviteSubject ?? defaults.subject,
    body: loaded.event.inviteBody ?? defaults.body,
  });
}

/**
 * Sends the invite through SendCert to everyone not invited yet, up to the
 * provider's daily cap and the monthly allowance. Never fails halfway: it
 * sends what fits and reports what's left; calling it again resumes.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const loaded = await load(params.id);
  if (loaded.error) return loaded.error;
  const { owner } = loaded;
  let event: EventRecord = loaded.event;

  let subject: string;
  let body: string;
  try {
    const json = (await req.json()) as { subject?: unknown; body?: unknown };
    const defaults = inviteText(event, event.locale);
    subject = typeof json.subject === 'string' && json.subject.trim() ? json.subject.trim().slice(0, 200) : defaults.subject;
    body = typeof json.body === 'string' && json.body.trim() ? json.body.trim().slice(0, 5000) : defaults.body;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  // Remember the message for next time (and for the dashboard).
  event = (await updateEvent(owner.id, event.id, { ...event, inviteSubject: subject, inviteBody: body })) ?? event;

  const people = await listRecipients(event);
  const before = await plan(owner.id, people);
  if (before.now === 0) {
    return NextResponse.json({ sent: 0, failed: 0, ...before, message: before.pending === 0 ? 'nothing_pending' : before.monthlyRemaining === 0 ? 'monthly_limit' : 'daily_limit' });
  }

  const batch = pendingOf(people).slice(0, before.now);
  const quota = await consumeUserQuota(owner.id, batch.length);
  if (!quota.allowed) {
    return NextResponse.json({ error: `You've reached the ${USER_LIMIT}-email limit for this month.` }, { status: 429 });
  }

  let smtp;
  try {
    smtp = loadSmtpConfigFromEnv();
  } catch (err) {
    await consumeUserQuota(owner.id, -batch.length);
    await logEvent('events.invite_failed', { message: errorMessage(err), path: '/api/events/[id]/invites', userId: owner.id });
    return NextResponse.json({ error: 'Email sending is not configured.' }, { status: 500 });
  }
  const transporter = createTransporter(smtp);

  const delivered: string[] = [];
  const reasons = new Set<string>();
  for (const person of batch) {
    try {
      const mail = buildInviteEmail(event, person, subject, body);
      await sendMail(transporter, smtp, {
        to: person.email,
        subject: mail.subject,
        body: mail.text,
        text: mail.text,
        html: mail.html,
        headers: mail.headers,
        fromName: mail.fromName,
        replyTo: event.replyTo ?? owner.email ?? undefined,
        locale: event.locale,
      });
      delivered.push(person.id);
    } catch (err) {
      reasons.add(errorMessage(err));
    }
  }
  const failed = batch.length - delivered.length;

  await markInvited(delivered);
  if (failed > 0) await consumeUserQuota(owner.id, -failed);
  await logSend({ userId: owner.id, ipHash: '', template: 'invite', recipients: batch.length, sent: delivered.length, failed, eventId: event.id, kind: 'invite' });
  countDevSends(delivered.length);
  if (failed > 0) {
    await logEvent('events.invite_recipients_failed', {
      level: delivered.length === 0 ? 'error' : 'warn',
      message: `${failed} of ${batch.length} invites failed: ${Array.from(reasons).slice(0, 3).join(' | ')}`,
      path: '/api/events/[id]/invites',
      userId: owner.id,
    });
  }
  const after = await plan(owner.id, await listRecipients(event));
  return NextResponse.json({ sent: delivered.length, failed, ...after });
}
