import { NextResponse, type NextRequest } from 'next/server';
import { getEventOwner } from '@/lib/eventMode/owner';
import { getEvent, updateEvent } from '@/lib/eventMode/store';
import { EventInputError, parseEventInput } from '@/lib/eventMode/validate';
import { errorMessage, logEvent } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Updates an event's details (and its share card design). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getEventOwner();
  if (!owner) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const current = await getEvent(owner.id, params.id);
  if (!current) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const event = await updateEvent(owner.id, params.id, parseEventInput({ ...current, ...body }, current.locale));
    return NextResponse.json({ ok: true, id: event?.id });
  } catch (err) {
    if (err instanceof EventInputError) return NextResponse.json({ error: err.message }, { status: 400 });
    await logEvent('events.update_failed', { message: errorMessage(err), path: '/api/events/[id]', userId: owner.id });
    return NextResponse.json({ error: 'Could not save the event.' }, { status: 500 });
  }
}
