import type { Metadata } from 'next';
import Link from 'next/link';
import { CERT_WIDTH } from '@/lib/certificateSize';
import {
  createServiceSupabaseClient,
  isSupabaseServiceConfigured,
} from '@/lib/supabase';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Each /verify/[id] page is dynamic — it reflects the current row in
// certificates_issued. Disabling caching means a freshly issued certificate
// is verifiable the moment the API insert returns.
export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

type FontFamily = 'helvetica' | 'times' | 'courier';

type TextOverlay = {
  x: number; // percent, center of the text
  y: number;
  fontSize: number; // relative to a CERT_WIDTH-wide certificate
  color: string;
  fontFamily?: FontFamily;
};

type CertificateBatch = {
  template_image: string;
  width: number;
  height: number;
  text_config: TextOverlay;
  extra_fields: (TextOverlay & { text: string })[];
};

type CertificateRecord = {
  verify_id: string;
  recipient_name: string;
  course_name: string | null;
  issuer_name: string | null;
  issued_date: string;
  expiry_date: string | null;
  verify_domain: string;
  certificate_batches: CertificateBatch | null;
};

async function fetchCertificate(verifyId: string): Promise<CertificateRecord | null> {
  if (!isSupabaseServiceConfigured()) return null;
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('certificates_issued')
    .select(
      'verify_id, recipient_name, course_name, issuer_name, issued_date, expiry_date, verify_domain, certificate_batches(template_image, width, height, text_config, extra_fields)',
    )
    .eq('verify_id', verifyId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as CertificateRecord;
}

const SVG_FONTS: Record<FontFamily, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  times: 'Georgia, "Times New Roman", serif',
  courier: '"Courier New", monospace',
};

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
  const cert = await fetchCertificate(params.id);
  if (!cert) {
    return {
      title: 'Certificate not found',
      robots: { index: false, follow: false },
    };
  }
  const title = `${cert.recipient_name} — ${cert.course_name ?? 'Verified Certificate'}`;
  const description = `Verified certificate issued by ${cert.issuer_name ?? 'SendCert'} on ${cert.issued_date}. Verify ID: ${cert.verify_id}.`;
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/verify/${cert.verify_id}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${siteUrl}/verify/${cert.verify_id}`,
    },
  };
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isExpired(expiry: string | null): boolean {
  if (!expiry) return false;
  return new Date(expiry).getTime() < Date.now();
}

export default async function VerifyPage({ params }: Props) {
  const cert = await fetchCertificate(params.id);

  if (!cert) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">🚫</div>
          <h1 className="mt-3 text-xl font-bold text-gray-900">
            Certificate not found
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            We couldn&apos;t find a certificate with ID{' '}
            <code className="rounded bg-gray-100 px-1">{params.id}</code>. Double-check
            the URL and try again.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-brand-600 underline"
          >
            Back to SendCert
          </Link>
        </div>
      </main>
    );
  }

  const expired = isExpired(cert.expiry_date);

  // schema.org Credential markup. Helps both classic SERPs and LLM answers
  // surface the verification page when someone searches for the recipient
  // or the verify ID.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOccupationalCredential',
    name: cert.course_name ?? 'Certificate',
    credentialCategory: 'Certificate',
    recognizedBy: {
      '@type': 'Organization',
      name: cert.issuer_name ?? 'SendCert',
    },
    dateCreated: cert.issued_date,
    expires: cert.expiry_date ?? undefined,
    identifier: cert.verify_id,
    url: `${siteUrl}/verify/${cert.verify_id}`,
    about: {
      '@type': 'Person',
      name: cert.recipient_name,
    },
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl">
        {/* Verification badge bar */}
        <div
          className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${
            expired
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-green-200 bg-green-50 text-green-900'
          }`}
        >
          <span className="text-2xl" aria-hidden>
            {expired ? '⚠️' : '✓'}
          </span>
          <div>
            <p className="font-semibold">
              {expired ? 'Expired Certificate' : 'Verified Certificate'}
            </p>
            <p className="text-sm">
              ID <code className="rounded bg-white/50 px-1 font-mono">{cert.verify_id}</code>
            </p>
          </div>
        </div>

        {/* Certificate image */}
        {cert.certificate_batches && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <CertificateSvg batch={cert.certificate_batches} name={cert.recipient_name} />
          </div>
        )}

        {/* Metadata */}
        <dl className="mt-6 grid gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Recipient
            </dt>
            <dd className="mt-1 text-base font-semibold text-gray-900">
              {cert.recipient_name}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Course
            </dt>
            <dd className="mt-1 text-base text-gray-900">
              {cert.course_name ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Issued by
            </dt>
            <dd className="mt-1 text-base text-gray-900">
              {cert.issuer_name ?? 'SendCert'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Issue date
            </dt>
            <dd className="mt-1 text-base text-gray-900">
              {formatDate(cert.issued_date)}
            </dd>
          </div>
          {cert.expiry_date && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {expired ? 'Status' : 'Valid until'}
              </dt>
              <dd
                className={`mt-1 text-base ${
                  expired ? 'font-semibold text-red-600' : 'text-gray-900'
                }`}
              >
                {expired ? 'Expired' : formatDate(cert.expiry_date)}
              </dd>
            </div>
          )}
        </dl>

        <footer className="mt-8 text-center text-xs text-gray-500">
          <p>
            Powered by{' '}
            <Link
              href="/?utm_source=verify_page&utm_medium=referral&utm_campaign=powered_by"
              className="font-medium text-brand-600 underline"
            >
              SendCert
            </Link>{' '}
            · {cert.verify_domain}
          </p>
        </footer>
      </div>
    </main>
  );
}
