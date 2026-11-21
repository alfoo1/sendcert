import type { Metadata } from 'next';
import Link from 'next/link';
import { CERT_WIDTH } from '@/lib/certificateSize';
import {
  certificateTitle,
  formatDate,
  getCertificate,
  isExpired,
  type CertificateBatch,
  type FontFamily,
} from '@/lib/certificates';
import { sans } from '@/components/landing/fonts';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { localizePath, tx, type Locale, type Tx } from '@/lib/i18n';
import ShareActions from './ShareActions';

// Page strings. The page renders in the language the certificate was sent in.
const COPY = {
  notFoundTitle: { en: 'No certificate with this ID', es: 'No hay un certificado con este ID' },
  notFoundBody1: { en: 'We couldn’t find a certificate with ID', es: 'No encontramos un certificado con el ID' },
  notFoundBody2: {
    en: 'Check that the link or ID was copied exactly. If it was, this certificate wasn’t issued through SendCert.',
    es: 'Revisa que el enlace o el ID estén copiados exactamente. Si lo están, este certificado no fue emitido con SendCert.',
  },
  verified: { en: 'Verified certificate', es: 'Certificado verificado' },
  expiredTitle: { en: 'Genuine certificate · expired', es: 'Certificado auténtico · vencido' },
  issued: { en: 'Issued', es: 'Emitido' },
  by: { en: 'by', es: 'por' },
  on: { en: 'on', es: 'el' },
  through: { en: 'through SendCert.', es: 'con SendCert.' },
  previewUnavailable: { en: 'Certificate preview not available', es: 'Vista previa no disponible' },
  awardedTo: { en: 'Awarded to', es: 'Otorgado a' },
  issuedBy: { en: 'Issued by', es: 'Emitido por' },
  issueDate: { en: 'Issue date', es: 'Fecha de emisión' },
  expiredOn: { en: 'Expired on', es: 'Venció el' },
  validUntil: { en: 'Valid until', es: 'Válido hasta' },
  certificateId: { en: 'Certificate ID', es: 'ID del certificado' },
  status: { en: 'Status', es: 'Estado' },
  valid: { en: 'Valid', es: 'Válido' },
  expired: { en: 'Expired', es: 'Vencido' },
  yours: { en: 'Is this your certificate?', es: '¿Es tu certificado?' },
  yoursBody: {
    en: 'Add it to your profile or share it. This page is the proof that it’s real.',
    es: 'Agrégalo a tu perfil o compártelo. Esta página es la prueba de que es auténtico.',
  },
  howTitle: { en: 'How this verification works', es: 'Cómo funciona esta verificación' },
  p1Title: { en: 'A unique ID', es: 'Un ID único' },
  p1: {
    en: 'Every certificate sent with SendCert gets its own ID and its own page on sendcert.org.',
    es: 'Cada certificado enviado con SendCert tiene su propio ID y su propia página en sendcert.org.',
  },
  p2Title: { en: 'Recorded at issue', es: 'Registrado al emitirse' },
  p2: {
    en: 'This record was created when the certificate was sent. The recipient can’t edit it.',
    es: 'Este registro se creó cuando se envió el certificado. Quien lo recibe no puede editarlo.',
  },
  p3Title: { en: 'Easy to check', es: 'Fácil de comprobar' },
  p3: {
    en: 'If a PDF or printout doesn’t match the name, certificate and date on this page, it isn’t genuine.',
    es: 'Si un PDF o una copia impresa no coincide con el nombre, el certificado y la fecha de esta página, no es auténtico.',
  },
  header: { en: 'Certificate verification', es: 'Verificación de certificados' },
  mission: {
    en: 'SendCert makes verifiable certificates free for every teacher, trainer and nonprofit.',
    es: 'SendCert hace que los certificados verificables sean gratis para cada docente, capacitador y ONG.',
  },
  issueOwn: { en: 'Issue your own certificates, free →', es: 'Emite tus propios certificados gratis →' },
  descIssued: { en: 'Verified certificate issued', es: 'Certificado verificado emitido' },
} satisfies Record<string, Tx>;

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

// Each /verify/[id] page reflects the current row in certificates_issued, so
// a freshly issued certificate is verifiable the moment the API insert returns.
export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const SVG_FONTS: Record<FontFamily, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  times: 'Georgia, "Times New Roman", serif',
  courier: '"Courier New", monospace',
};

const homeLink = (locale: Locale) =>
  `${localizePath('/', locale)}?utm_source=verify_page&utm_medium=referral&utm_campaign=powered_by`;

// Same geometry as lib/pdf.ts: percent position of the text's center, font
// size relative to a CERT_WIDTH-wide certificate. The SVG viewBox uses the
// original template size, so it scales to any screen width.
function CertificateSvg({ batch, name }: { batch: CertificateBatch; name: string }) {
  const overlays = [{ ...batch.text_config, text: name }, ...(batch.extra_fields ?? [])];
  return (
    <svg
      viewBox={`0 0 ${batch.width} ${batch.height}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`Certificate for ${name}`}
    >
      <image
        href={batch.template_image}
        x={0}
        y={0}
        width={batch.width}
        height={batch.height}
        preserveAspectRatio="none"
      />
      {overlays.map((o, i) => (
        <text
          key={i}
          x={(o.x / 100) * batch.width}
          y={(o.y / 100) * batch.height}
          fontSize={o.fontSize * (batch.width / CERT_WIDTH)}
          fill={o.color}
          fontFamily={SVG_FONTS[o.fontFamily ?? 'helvetica']}
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {o.text}
        </text>
      ))}
    </svg>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cert = await getCertificate(params.id);
  if (!cert) {
    return { title: 'Certificate not found', robots: { index: false, follow: false } };
  }
  const l = cert.locale;
  const title = `${cert.recipient_name} · ${certificateTitle(cert, l)}`;
  const issuer = cert.issuer_name ? ` ${tx(l, COPY.by)} ${cert.issuer_name}` : '';
  const description = `${tx(l, COPY.descIssued)}${issuer} ${tx(l, COPY.on)} ${formatDate(cert.issued_date, l)}. ${tx(l, COPY.certificateId)} ${cert.verify_id}.`;
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/verify/${cert.verify_id}` },
    // Recipients share these pages; they shouldn't turn people's names into
    // search results, and thousands of thin pages would dilute the site.
    robots: { index: false, follow: true },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${siteUrl}/verify/${cert.verify_id}`,
      siteName: 'SendCert',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function VerifyPage({ params }: Props) {
  const cert = await getCertificate(params.id, { withDesign: true });

  if (!cert) {
    return (
      <div className={`${sans.className} flex min-h-screen flex-col bg-slate-50`}>
        <VerifyHeader locale="en" />
        <main className="flex flex-1 items-center justify-center px-5 py-16">
          <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">
              ✕
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900">{COPY.notFoundTitle.en}</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {COPY.notFoundBody1.en}{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-800">{params.id}</code>.{' '}
              {COPY.notFoundBody2.en}
            </p>
          </div>
        </main>
        <VerifyFooter locale="en" />
      </div>
    );
  }

  const l = cert.locale;
  const t = (c: Tx) => tx(l, c);
  const expired = isExpired(cert.expiry_date);
  const title = certificateTitle(cert, l);
  const pageUrl = `${siteUrl}/verify/${cert.verify_id}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOccupationalCredential',
    name: title,
    credentialCategory: 'Certificate',
    ...(cert.issuer_name
      ? { recognizedBy: { '@type': 'Organization', name: cert.issuer_name } }
      : {}),
    dateCreated: cert.issued_date,
    expires: cert.expiry_date ?? undefined,
    identifier: cert.verify_id,
    url: pageUrl,
    about: { '@type': 'Person', name: cert.recipient_name },
  };

  return (
    <LocaleProvider locale={l}>
    <div className={`${sans.className} flex min-h-screen flex-col bg-slate-50`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <VerifyHeader locale={l} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {/* Status */}
        <div
          className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${
            expired ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <span
            aria-hidden
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
              expired ? 'bg-amber-500' : 'bg-emerald-600'
            }`}
          >
            {expired ? '!' : '✓'}
          </span>
          <div>
            <p className={`font-semibold ${expired ? 'text-amber-900' : 'text-emerald-900'}`}>
              {expired ? t(COPY.expiredTitle) : t(COPY.verified)}
            </p>
            <p className={`mt-0.5 text-sm ${expired ? 'text-amber-800' : 'text-emerald-800'}`}>
              {t(COPY.issued)} {cert.issuer_name ? `${t(COPY.by)} ${cert.issuer_name} ` : ''}
              {t(COPY.on)} {formatDate(cert.issued_date, l)} {t(COPY.through)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          {/* Certificate */}
          <div className="lg:col-span-3">
            {cert.certificate_batches ? (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-sm sm:p-3">
                <CertificateSvg batch={cert.certificate_batches} name={cert.recipient_name} />
              </div>
            ) : (
              <div className="flex aspect-[1200/927] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-sm text-gray-500">
                {t(COPY.previewUnavailable)}
              </div>
            )}
          </div>

          {/* Details + actions */}
          <aside className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t(COPY.awardedTo)}</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-gray-900">
                {cert.recipient_name}
              </h1>
              <p className="mt-1 text-base text-gray-700">{title}</p>

              <dl className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm">
                <Row label={t(COPY.issuedBy)}>{cert.issuer_name ?? '—'}</Row>
                <Row label={t(COPY.issueDate)}>{formatDate(cert.issued_date, l)}</Row>
                {cert.expiry_date && (
                  <Row label={expired ? t(COPY.expiredOn) : t(COPY.validUntil)}>
                    {formatDate(cert.expiry_date, l)}
                  </Row>
                )}
                <Row label={t(COPY.certificateId)}>
                  <span className="font-mono text-[13px] text-gray-900">{cert.verify_id}</span>
                </Row>
                <Row label={t(COPY.status)}>
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${
                      expired ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full ${expired ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    />
                    {expired ? t(COPY.expired) : t(COPY.valid)}
                  </span>
                </Row>
              </dl>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-semibold text-gray-900">{t(COPY.yours)}</p>
              <p className="mb-4 mt-1 text-sm text-gray-600">{t(COPY.yoursBody)}</p>
              <ShareActions verifyId={cert.verify_id} pageUrl={pageUrl} />
            </div>
          </aside>
        </div>

        {/* How verification works */}
        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <h2 className="text-base font-semibold text-gray-900">{t(COPY.howTitle)}</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <Point title={t(COPY.p1Title)}>{t(COPY.p1)}</Point>
            <Point title={t(COPY.p2Title)}>{t(COPY.p2)}</Point>
            <Point title={t(COPY.p3Title)}>{t(COPY.p3)}</Point>
          </div>
        </section>
      </main>

      <VerifyFooter locale={l} />
    </div>
    </LocaleProvider>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="text-right text-gray-900">{children}</dd>
    </div>
  );
}

function Point({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">{children}</p>
    </div>
  );
}

function VerifyHeader({ locale }: { locale: Locale }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href={homeLink(locale)} className="flex items-center gap-2 text-base font-bold text-gray-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm text-white">
            S
          </span>
          SendCert
        </Link>
        <span className="text-xs font-medium text-gray-500">{tx(locale, COPY.header)}</span>
      </div>
    </header>
  );
}

function VerifyFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-8 text-center sm:px-6">
        <p className="max-w-md text-sm text-gray-600">{tx(locale, COPY.mission)}</p>
        <Link
          href={homeLink(locale)}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          {tx(locale, COPY.issueOwn)}
        </Link>
      </div>
    </footer>
  );
}
