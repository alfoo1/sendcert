import { NextResponse, type NextRequest } from 'next/server';
import { resolvePublicToken } from '@/lib/eventMode/publicAccess';
import { setRsvp } from '@/lib/eventMode/store';
import { errorMessage, logEvent } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * "I'll be there" / "I can't make it" from the personal page. Declining is
 * not an unsubscribe: the person can still receive this organizer's emails.
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { found, response } = await resolvePublicToken(req, params.token, 'rsvp');
  if (!found) return response;
  let answer: 'yes' | 'no';
  let reason: string | null = null;
  try {
    const body = (await req.json()) as { answer?: unknown; reason?: unknown };
    if (body.answer !== 'yes' && body.answer !== 'no') return NextResponse.json({ error: 'Invalid answer.' }, { status: 400 });
    answer = body.answer;
    if (answer === 'no' && typeof body.reason === 'string' && body.reason.trim()) reason = body.reason.trim().slice(0, 500);
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  try {
    await setRsvp(found.recipient.id, answer, reason);
    return NextResponse.json({ ok: true, answer });
  } catch (err) {
    await logEvent('events.rsvp_failed', { message: errorMessage(err), path: '/api/e/[token]/rsvp' });
    return NextResponse.json({ error: 'Could not save your answer. Please try again.' }, { status: 500 });
  }
}
