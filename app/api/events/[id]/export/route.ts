import { NextResponse, type NextRequest } from 'next/server';
import { getEventOwner } from '@/lib/eventMode/owner';
import { getEvent, listRecipients } from '@/lib/eventMode/store';
import { bucketOf } from '@/lib/eventMode/logic';
import { personalLink } from '@/lib/eventMode/links';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cell(value: string | null | undefined): string {
  const text = value ?? '';
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const STATUS = {
  en: { coming: 'Coming', not_coming: 'Not coming', no_answer: 'No answer' },
  es: { coming: 'Va', not_coming: 'No va', no_answer: 'Sin respuesta' },
} as const;

/**
 * CSV of an event's people. ?type=links: name, email and personal link (for
 * sending from your own mailbox or a mail-merge tool). ?type=responses: adds
 * the answer, reason, dates and unsubscribes. ?status= filters by bucket.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getEventOwner();
  if (!owner) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const event = await getEvent(owner.id, params.id);
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type') === 'responses' ? 'responses' : 'links';
  const status = url.searchParams.get('status');
  const es = event.locale === 'es';
  let people = await listRecipients(event);
  if (status === 'unsubscribed') people = people.filter((p) => p.unsubscribed);
  else if (status === 'coming' || status === 'not_coming' || status === 'no_answer') {
    people = people.filter((p) => bucketOf(p) === status);
  }

  const header =
    type === 'links'
      ? es
        ? ['Nombre', 'Correo', 'Enlace personal']
        : ['Name', 'Email', 'Personal link']
      : es
        ? ['Nombre', 'Correo', 'Respuesta', 'Motivo', 'Respondió', 'Baja de correos', 'Enlace personal']
        : ['Name', 'Email', 'Answer', 'Reason', 'Answered at', 'Unsubscribed', 'Personal link'];
  const lines = [header.join(',')];
  for (const p of people) {
    const link = personalLink(p.token);
    const row =
      type === 'links'
        ? [p.name, p.email, link]
        : [
            p.name,
            p.email,
            STATUS[es ? 'es' : 'en'][bucketOf(p)],
            p.rsvpReason,
            p.respondedAt ? p.respondedAt.slice(0, 16).replace('T', ' ') : '',
            p.unsubscribed ? (es ? 'Sí' : 'Yes') : '',
            link,
          ];
    lines.push(row.map(cell).join(','));
  }
  const slug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'event';
  return new NextResponse(`﻿${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}-${type}${status ? `-${status}` : ''}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
