'use client';

import { useEffect } from 'react';
import { isValidEmail } from '@/lib/validation';

// replyTo: where recipients' replies go. Empty means SendCert's inbox.
// verification: a public page per certificate (default on).
// certificateName / issuerName: shown on that page and prefilled on LinkedIn.
export type EmailConfig = {
  subject: string;
  body: string;
  replyTo?: string;
  verification?: boolean;
  certificateName?: string;
  issuerName?: string;
};

type Props = {
  emailConfig: EmailConfig;
  onEmailConfigChange: (cfg: EmailConfig) => void;
  // Prefill values taken from the certificate design, when there is one.
  suggestedCertificateName?: string;
  suggestedIssuerName?: string;
};

// Step 4: compose the subject and body. SMTP is server-side now — users don't
// configure credentials, every email ships from SendCert's branded sender.
export default function EmailStep({
  emailConfig,
  onEmailConfigChange,
  suggestedCertificateName,
  suggestedIssuerName,
}: Props) {
  function update<K extends keyof EmailConfig>(key: K, value: EmailConfig[K]) {
    onEmailConfigChange({ ...emailConfig, [key]: value });
  }

  const verificationOn = emailConfig.verification !== false;

  // First visit to this step: prefill the credential fields from the design.
  useEffect(() => {
    if (emailConfig.certificateName !== undefined && emailConfig.issuerName !== undefined) return;
    onEmailConfigChange({
      ...emailConfig,
      certificateName: emailConfig.certificateName ?? suggestedCertificateName ?? '',
      issuerName: emailConfig.issuerName ?? suggestedIssuerName ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Compose the email</h2>
        <p className="mt-1 text-gray-600">
          Write the message your recipients will get alongside their PDF certificate.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Subject</label>
          <input
            type="text"
            value={emailConfig.subject}
            onChange={(e) => update('subject', e.target.value)}
            placeholder="Your certificate — {{name}}"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            You can use <code className="rounded bg-gray-100 px-1">{'{{name}}'}</code> in the subject.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Message body</label>
          <textarea
            rows={8}
            value={emailConfig.body}
            onChange={(e) => update('body', e.target.value)}
            placeholder={`Hi {{name}},\n\nCongratulations on completing the course. Your certificate is attached.\n\nBest regards!`}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
          />
          <p className="mt-1 text-xs text-gray-500">
            Available variable: <code className="rounded bg-gray-100 px-1">{'{{name}}'}</code>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Your email for replies <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="email"
            value={emailConfig.replyTo ?? ''}
            onChange={(e) => update('replyTo', e.target.value)}
            placeholder="you@school.org"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p
            className={`mt-1 text-xs ${
              emailConfig.replyTo && !isValidEmail(emailConfig.replyTo)
                ? 'text-red-600'
                : 'text-gray-500'
            }`}
          >
            {emailConfig.replyTo && !isValidEmail(emailConfig.replyTo)
              ? 'Enter a valid email or leave it empty.'
              : 'When a recipient hits Reply, their message comes to you.'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Verification &amp; sharing</p>
            <p className="mt-1 text-sm text-gray-600">
              Each recipient gets a public page with a unique certificate ID that proves it&apos;s
              real, plus a one-click button to add it to LinkedIn. Free, no account needed.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={verificationOn}
            aria-label="Verification pages"
            onClick={() => update('verification', !verificationOn)}
            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
              verificationOn ? 'bg-brand-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                verificationOn ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {verificationOn ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Certificate name</label>
              <input
                type="text"
                value={emailConfig.certificateName ?? ''}
                onChange={(e) => update('certificateName', e.target.value)}
                placeholder="e.g. Teaching Smarter with AI"
                maxLength={150}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Issued by</label>
              <input
                type="text"
                value={emailConfig.issuerName ?? ''}
                onChange={(e) => update('issuerName', e.target.value)}
                placeholder="e.g. your school or organization"
                maxLength={150}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 sm:col-span-2">
              Shown on the verification page and prefilled when recipients add the certificate to
              LinkedIn. We store the recipient&apos;s name, never their email.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-gray-500">
            No verification pages will be created, and nothing about these certificates is stored.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
        <p>
          📬 All emails are sent from the SendCert sender. A short footer is added to
          each outgoing message so your recipients know where the certificate came from.
        </p>
      </div>
    </div>
  );
}
