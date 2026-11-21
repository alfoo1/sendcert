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
import ShareActions from './ShareActions';

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

const HOME_LINK = '/?utm_source=verify_page&utm_medium=referral&utm_campaign=powered_by';

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
  const title = `${cert.recipient_name} · ${certificateTitle(cert)}`;
  const issuer = cert.issuer_name ? ` by ${cert.issuer_name}` : '';
  const description = `Verified certificate issued${issuer} on ${formatDate(cert.issued_date)}. Certificate ID ${cert.verify_id}.`;
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
        <VerifyHeader />
        <main className="flex flex-1 items-center justify-center px-5 py-16">
          <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">
              ✕
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900">No certificate with this ID</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              We couldn&apos;t find a certificate with ID{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-800">{params.id}</code>.
              Check that the link or ID was copied exactly. If it was, this certificate wasn&apos;t
              issued through SendCert.
            </p>
          </div>
        </main>
        <VerifyFooter />
      </div>
    );
  }

  const expired = isExpired(cert.expiry_date);
  const title = certificateTitle(cert);
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
    <div className={`${sans.className} flex min-h-screen flex-col bg-slate-50`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <VerifyHeader />

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
              {expired ? 'Genuine certificate · expired' : 'Verified certificate'}
            </p>
            <p className={`mt-0.5 text-sm ${expired ? 'text-amber-800' : 'text-emerald-800'}`}>
              Issued {cert.issuer_name ? `by ${cert.issuer_name} ` : ''}on{' '}
              {formatDate(cert.issued_date)} through SendCert.
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
                Certificate preview not available
              </div>
            )}
          </div>

          {/* Details + actions */}
          <aside className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Awarded to</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-gray-900">
                {cert.recipient_name}
              </h1>
              <p className="mt-1 text-base text-gray-700">{title}</p>

              <dl className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm">
                <Row label="Issued by">{cert.issuer_name ?? '—'}</Row>
                <Row label="Issue date">{formatDate(cert.issued_date)}</Row>
                {cert.expiry_date && (
                  <Row label={expired ? 'Expired on' : 'Valid until'}>
                    {formatDate(cert.expiry_date)}
                  </Row>
                )}
                <Row label="Certificate ID">
                  <span className="font-mono text-[13px] text-gray-900">{cert.verify_id}</span>
                </Row>
                <Row label="Status">
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${
                      expired ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full ${expired ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    />
                    {expired ? 'Expired' : 'Valid'}
                  </span>
                </Row>
              </dl>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-semibold text-gray-900">Is this your certificate?</p>
              <p className="mb-4 mt-1 text-sm text-gray-600">
                Add it to your profile or share it. This page is the proof that it&apos;s real.
              </p>
              <ShareActions verifyId={cert.verify_id} pageUrl={pageUrl} />
            </div>
          </aside>
        </div>

        {/* How verification works */}
        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <h2 className="text-base font-semibold text-gray-900">How this verification works</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <Point title="A unique ID">
              Every certificate sent with SendCert gets its own ID and its own page on sendcert.org.
            </Point>
            <Point title="Recorded at issue">
              This record was created when the certificate was sent. The recipient can&apos;t edit it.
            </Point>
            <Point title="Easy to check">
              If a PDF or printout doesn&apos;t match the name, certificate and date on this page, it
              isn&apos;t genuine.
            </Point>
          </div>
        </section>
      </main>

      <VerifyFooter />
    </div>
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

function VerifyHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href={HOME_LINK} className="flex items-center gap-2 text-base font-bold text-gray-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm text-white">
            S
          </span>
          SendCert
        </Link>
        <span className="text-xs font-medium text-gray-500">Certificate verification</span>
      </div>
    </header>
  );
}

function VerifyFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-8 text-center sm:px-6">
        <p className="max-w-md text-sm text-gray-600">
          SendCert makes verifiable certificates free for every teacher, trainer and nonprofit.
        </p>
        <Link
          href={HOME_LINK}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Issue your own certificates, free →
        </Link>
      </div>
    </footer>
  );
}
