import { NextResponse } from 'next/server';
import { getSendDetail } from '@/lib/account';
import { getLoggedInUser } from '@/lib/session';
import { isSupabaseServiceConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sendcert.org').replace(/\/$/, '');

function csvCell(value: string | null | undefined): string {
  const text = value ?? '';
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Spreadsheet of one send: who got it and each verification link. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getLoggedInUser();
  if (!user || !isSupabaseServiceConfigured()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const send = await getSendDetail(user.id, params.id);
  if (!send) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const es = send.locale === 'es';
  const header = es
    ? ['Nombre', 'Correo', 'Certificado', 'Emitido por', 'Fecha', 'ID', 'Enlace de verificación', 'Agregado a LinkedIn']
    : ['Name', 'Email', 'Certificate', 'Issued by', 'Date', 'ID', 'Verification link', 'Added to LinkedIn'];
  const lines = [header.join(',')];
  for (const r of send.recipients) {
    lines.push(
      [
        r.name,
        r.email,
        send.credential,
        send.issuer,
        send.issuedDate,
        r.verifyId,
        `${SITE_URL}/verify/${r.verifyId}`,
        r.linkedInAdded ? (es ? 'Sí' : 'Yes') : (es ? 'No' : 'No'),
      ]
        .map(csvCell)
        .join(','),
    );
  }
  const slug = (send.credential ?? 'certificates').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'certificates';
  // BOM so Excel opens accents (á, ñ) correctly.
  return new NextResponse(`﻿${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sendcert-${slug}-${(send.issuedDate ?? '').slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
