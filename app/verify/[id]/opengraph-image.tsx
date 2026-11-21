import { ImageResponse } from 'next/og';
import { CERT_WIDTH } from '@/lib/certificateSize';
import {
  certificateTitle,
  formatDate,
  getCertificate,
  type FontFamily,
} from '@/lib/certificates';

// Preview card for LinkedIn / social shares of a verification page: the
// certificate with the recipient's name on the left, details on the right.
export const runtime = 'nodejs';
export const alt = 'Verified certificate';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Metric-compatible stand-ins for the PDF's standard fonts.
const NAME_FONTS: Record<FontFamily, string> = {
  helvetica: 'Arimo',
  times: 'Tinos',
  courier: 'Cousine',
};

async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`,
      { cache: 'force-cache' },
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url, { cache: 'force-cache' }).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { id: string } }) {
  const cert = await getCertificate(params.id, { withDesign: true });
  const batch = cert?.certificate_batches ?? null;
  const nameFont = NAME_FONTS[batch?.text_config.fontFamily ?? 'helvetica'];

  const [inter400, inter700, certFont] = await Promise.all([
    loadGoogleFont('Inter', 400),
    loadGoogleFont('Inter', 700),
    loadGoogleFont(nameFont, 700),
  ]);
  const fonts = [
    inter400 && { name: 'Inter', data: inter400, weight: 400 as const, style: 'normal' as const },
    inter700 && { name: 'Inter', data: inter700, weight: 700 as const, style: 'normal' as const },
    certFont && { name: nameFont, data: certFont, weight: 700 as const, style: 'normal' as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }[];

  if (!cert) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: 'Inter', fontSize: 44, fontWeight: 700, color: '#0f172a' }}>
          SendCert · Certificate verification
        </div>
      ),
      { ...size, fonts },
    );
  }

  // Fit the certificate in a 620 x 500 box on the left.
  const scale = batch ? Math.min(620 / batch.width, 500 / batch.height) : 1;
  const w = batch ? Math.round(batch.width * scale) : 620;
  const h = batch ? Math.round(batch.height * scale) : 480;
  const overlays = batch
    ? [{ ...batch.text_config, text: cert.recipient_name }, ...(batch.extra_fields ?? [])]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 60%, #ecfdf5 100%)',
          fontFamily: 'Inter',
          padding: '0 56px',
        }}
      >
        {/* Certificate */}
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: w,
            height: h,
            background: '#ffffff',
            borderRadius: 10,
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
            overflow: 'hidden',
          }}
        >
          {batch && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={batch.template_image} width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }} alt="" />
          )}
          {overlays.map((o, i) => {
            const fontSize = Math.max(8, o.fontSize * (w / CERT_WIDTH));
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: (o.x / 100) * w - 400,
                  top: (o.y / 100) * h - fontSize * 0.7,
                  width: 800,
                  height: fontSize * 1.4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize,
                  fontWeight: 700,
                  color: o.color,
                  fontFamily: i === 0 && certFont ? nameFont : 'Inter',
                  whiteSpace: 'nowrap',
                }}
              >
                {o.text}
              </div>
            );
          })}
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: 48, height: h, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                alignItems: 'center',
                background: '#d1fae5',
                color: '#065f46',
                fontSize: 20,
                fontWeight: 700,
                padding: '8px 16px',
                borderRadius: 999,
                letterSpacing: 1,
              }}
            >
              {cert.locale === 'es' ? '✓ CERTIFICADO VERIFICADO' : '✓ VERIFIED CERTIFICATE'}
            </div>
            <div style={{ display: 'flex', marginTop: 28, fontSize: 46, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
              {cert.recipient_name}
            </div>
            <div style={{ display: 'flex', marginTop: 16, fontSize: 28, color: '#334155', lineHeight: 1.25 }}>
              {certificateTitle(cert, cert.locale)}
            </div>
            <div style={{ display: 'flex', marginTop: 18, fontSize: 22, color: '#64748b' }}>
              {cert.issuer_name ? `${cert.issuer_name} · ` : ''}
              {formatDate(cert.issued_date, cert.locale)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 18, color: '#64748b' }}>ID {cert.verify_id}</div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#4f46e5',
                  color: '#ffffff',
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                S
              </div>
              <div style={{ display: 'flex', marginLeft: 10, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
                {cert.locale === 'es' ? 'Verificado en sendcert.org' : 'Verified on sendcert.org'}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
