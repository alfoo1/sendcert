'use client';

import { isValidEmail } from '@/lib/validation';

// replyTo: where recipients' replies go. Empty means SendCert's inbox.
export type EmailConfig = { subject: string; body: string; replyTo?: string };

type Props = {
  emailConfig: EmailConfig;
  onEmailConfigChange: (cfg: EmailConfig) => void;
};

// Step 4: compose the subject and body. SMTP is server-side now — users don't
// configure credentials, every email ships from SendCert's branded sender.
export default function EmailStep({ emailConfig, onEmailConfigChange }: Props) {
  function update<K extends keyof EmailConfig>(key: K, value: EmailConfig[K]) {
    onEmailConfigChange({ ...emailConfig, [key]: value });
  }

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

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
        <p>
          📬 All emails are sent from the SendCert sender. A short footer is added to
          each outgoing message so your recipients know where the certificate came from.
        </p>
      </div>
    </div>
  );
}
