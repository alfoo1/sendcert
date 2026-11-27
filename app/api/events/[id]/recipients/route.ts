import { NextResponse, type NextRequest } from 'next/server';
import { getEventOwner } from '@/lib/eventMode/owner';
import { addRecipients, getEvent } from '@/lib/eventMode/store';
import { parseRecipients } from '@/lib/eventMode/validate';
import { errorMessage, logEvent } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Adds more people to an event (late registrations). Emails already on it are skipped. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getEventOwner();
  if (!owner) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const event = await getEvent(owner.id, params.id);
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const { people, invalid } = parseRecipients(body.recipients);
    const { added, duplicates } = await addRecipients(event, people);
    return NextResponse.json({ added, duplicates: duplicates.length, invalid });
  } catch (err) {
    await logEvent('events.add_recipients_failed', { message: errorMessage(err), path: '/api/events/[id]/recipients', userId: owner.id });
    return NextResponse.json({ error: 'Could not add those people.' }, { status: 500 });
  }
}
