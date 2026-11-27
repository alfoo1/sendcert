import { NextResponse, type NextRequest } from 'next/server';
import { resolvePublicToken } from '@/lib/eventMode/publicAccess';
import { unsubscribeRecipient } from '@/lib/eventMode/store';
import { errorMessage, logEvent } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * "Unsubscribe from emails" for this organizer. Called from the confirm page
 * and by mail apps' one-click unsubscribe (RFC 8058 List-Unsubscribe-Post).
 * Does not change the attendance answer.
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { found, response } = await resolvePublicToken(req, params.token, 'unsubscribe');
  if (!found) return response;
  try {
    if (!found.recipient.unsubscribed) await unsubscribeRecipient(found.event, found.recipient);
    return NextResponse.json({ ok: true });
  } catch (err) {
    await logEvent('events.unsubscribe_failed', { message: errorMessage(err), path: '/api/e/[token]/unsubscribe' });
    return NextResponse.json({ error: 'Could not unsubscribe. Please try again.' }, { status: 500 });
  }
}
