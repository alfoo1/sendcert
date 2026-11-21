// LinkedIn deep links for a verified certificate. Kept in one place so a
// change on LinkedIn's side only needs one fix (every button goes through
// /verify/[id]/linkedin, which builds these URLs on the server).

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sendcert.org').replace(/\/$/, '');

export type CredentialForLinkedIn = {
  verifyId: string;
  certificateName: string;
  issuerName: string | null;
  issuedDate: string; // YYYY-MM-DD
  expiryDate: string | null;
};

export function publicVerifyUrl(verifyId: string): string {
  return `${SITE_URL}/verify/${verifyId}`;
}

/** Opens LinkedIn's "Add license or certification" form, prefilled. */
export function linkedInAddToProfileUrl(c: CredentialForLinkedIn): string {
  const [year, month] = c.issuedDate.split('-');
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: c.certificateName,
    issueYear: year,
    issueMonth: String(Number(month)),
    certUrl: publicVerifyUrl(c.verifyId),
    certId: c.verifyId,
  });
  if (c.issuerName) params.set('organizationName', c.issuerName);
  if (c.expiryDate) {
    const [ey, em] = c.expiryDate.split('-');
    params.set('expirationYear', ey);
    params.set('expirationMonth', String(Number(em)));
  }
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

/** Opens the LinkedIn post composer with a short default text and the link. */
export function linkedInShareUrl(c: CredentialForLinkedIn): string {
  const from = c.issuerName ? ` from ${c.issuerName}` : '';
  const text = `I just earned my "${c.certificateName}" certificate${from}. You can verify it here: ${publicVerifyUrl(c.verifyId)}`;
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
}
