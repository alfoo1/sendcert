import { NextResponse, type NextRequest } from 'next/server';
import { resolvePublicToken } from '@/lib/eventMode/publicAccess';
import { icsFile } from '@/lib/eventMode/format';
import { personalLink } from '@/lib/eventMode/links';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** "Add to calendar" (.ics for Apple Calendar and Outlook). */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const { found, response } = await resolvePublicToken(req, params.token, 'calendar');
  if (!found) return response;
  const ics = icsFile(found.event, found.recipient.id, personalLink(found.recipient.token));
  if (!ics) return NextResponse.json({ error: 'This event has no date yet.' }, { status: 404 });
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="event.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
