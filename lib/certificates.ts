import {
  createServiceSupabaseClient,
  isSupabaseServiceConfigured,
} from '@/lib/supabase';

export type FontFamily = 'helvetica' | 'times' | 'courier';

export type TextOverlay = {
  x: number; // percent, center of the text
  y: number;
  fontSize: number; // relative to a CERT_WIDTH-wide certificate
  color: string;
  fontFamily?: FontFamily;
};

export type CertificateBatch = {
  template_image: string;
  width: number;
  height: number;
  text_config: TextOverlay;
  extra_fields: (TextOverlay & { text: string })[];
};

export type CertificateRecord = {
  verify_id: string;
  recipient_name: string;
  course_name: string | null;
  issuer_name: string | null;
  issued_date: string;
  expiry_date: string | null;
  certificate_batches: CertificateBatch | null;
};

const FIELDS =
  'verify_id, recipient_name, course_name, issuer_name, issued_date, expiry_date';

/**
 * Public certificate lookup by verify ID, through the service role (the
 * table has no anonymous read policy, so recipient emails stay private).
 * Pass withDesign to also load the batch template for drawing it.
 */
export async function getCertificate(
  verifyId: string,
  { withDesign = false }: { withDesign?: boolean } = {},
): Promise<CertificateRecord | null> {
  if (!isSupabaseServiceConfigured() || !/^[A-Z0-9-]{6,40}$/i.test(verifyId)) return null;
  const supabase = createServiceSupabaseClient();
  const select = withDesign
    ? `${FIELDS}, certificate_batches(template_image, width, height, text_config, extra_fields)`
    : FIELDS;
  const { data, error } = await supabase
    .from('certificates_issued')
    .select(select)
    .eq('verify_id', verifyId)
    .maybeSingle();
  if (error || !data) return null;
  const record = data as unknown as CertificateRecord;
  if (!withDesign) record.certificate_batches = null;
  return record;
}

export function isExpired(expiry: string | null): boolean {
  if (!expiry) return false;
  return new Date(expiry).getTime() < Date.now();
}

export function formatDate(isoDate: string): string {
  // Dates are stored as YYYY-MM-DD; format in UTC so they never shift a day.
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** The name shown for a certificate, with a sensible fallback. */
export function certificateTitle(c: Pick<CertificateRecord, 'course_name'>): string {
  return c.course_name?.trim() || 'Certificate';
}
