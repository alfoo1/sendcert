import { NextRequest, NextResponse } from 'next/server';
import { getCertificate } from '@/lib/certificates';
import { logShareEvent } from '@/lib/shareEvents';

// Counts "Copy link" clicks on the verify page (LinkedIn clicks are counted
// by the /verify/[id]/linkedin redirect instead).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { verifyId?: string };
  const cert = body.verifyId ? await getCertificate(body.verifyId) : null;
  if (cert) await logShareEvent(cert.verify_id, 'copy_link', 'page');
  return NextResponse.json({ ok: true });
}
