import { NextResponse, type NextRequest } from 'next/server';
import { getEventOwner } from '@/lib/eventMode/owner';
import { addRecipients, createEvent, EventStoreError } from '@/lib/eventMode/store';
import { EventInputError, parseEventInput, parseRecipients } from '@/lib/eventMode/validate';
import { errorMessage, logEvent } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Creates an event with its recipients (event wizard, last step). */
export async function POST(req: NextRequest) {
  const owner = await getEventOwner();
  if (!owner) return NextResponse.json({ error: 'Sign in to create events.' }, { status: 401 });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const input = parseEventInput(body, 'en');
    const { people, invalid } = parseRecipients(body.recipients);
    if (people.length === 0) {
      return NextResponse.json({ error: 'Add at least one person with a name and a valid email.' }, { status: 400 });
    }
    const event = await createEvent(owner.id, input);
    const { added, duplicates } = await addRecipients(event, people);
    return NextResponse.json({ id: event.id, added, duplicates: duplicates.length, invalid });
  } catch (err) {
    if (err instanceof EventInputError) return NextResponse.json({ error: err.message }, { status: 400 });
    await logEvent('events.create_failed', { message: errorMessage(err), path: '/api/events', userId: owner.id });
    const status = err instanceof EventStoreError ? 503 : 500;
    return NextResponse.json({ error: 'Could not create the event. Please try again.' }, { status });
  }
}
