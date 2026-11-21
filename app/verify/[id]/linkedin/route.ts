import { NextRequest, NextResponse } from 'next/server';
import { certificateTitle, getCertificate } from '@/lib/certificates';
import { linkedInAddToProfileUrl, linkedInShareUrl } from '@/lib/linkedin';
import { logShareEvent } from '@/lib/shareEvents';

export const dynamic = 'force-dynamic';

/**
 * Every LinkedIn button (verify page and certificate email) points here:
 * /verify/<id>/linkedin?type=add|share&from=page|email
 * We count the click, then redirect to LinkedIn with the form prefilled.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const type = req.nextUrl.searchParams.get('type') === 'share' ? 'share' : 'add';
  const from = req.nextUrl.searchParams.get('from') === 'email' ? 'email' : 'page';
  const cert = await getCertificate(params.id);
  if (!cert) {
    return NextResponse.redirect(new URL(`/verify/${encodeURIComponent(params.id)}`, req.url));
  }

  await logShareEvent(cert.verify_id, type === 'add' ? 'linkedin_add' : 'linkedin_share', from);

  const credential = {
    verifyId: cert.verify_id,
    certificateName: certificateTitle(cert),
    issuerName: cert.issuer_name,
    issuedDate: cert.issued_date,
    expiryDate: cert.expiry_date,
  };
  const target = type === 'add' ? linkedInAddToProfileUrl(credential) : linkedInShareUrl(credential);
  return NextResponse.redirect(target, 302);
}
