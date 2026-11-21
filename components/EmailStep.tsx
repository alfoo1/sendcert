'use client';

import { useEffect } from 'react';
import { isValidEmail } from '@/lib/validation';
import { useLocale, useTx } from '@/components/i18n/LocaleProvider';

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
  const locale = useLocale();
  const t = useTx();
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
        <h2 className="text-2xl font-bold text-gray-900">
          {t({ en: 'Compose the email', es: 'Escribe el correo' })}
        </h2>
        <p className="mt-1 text-gray-600">
          {t({
            en: 'Write the message your recipients will get alongside their PDF certificate.',
            es: 'Escribe el mensaje que tus destinatarios recibirán junto con su certificado en PDF.',
          })}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t({ en: 'Subject', es: 'Asunto' })}
          </label>
          <input
            type="text"
            value={emailConfig.subject}
            onChange={(e) => update('subject', e.target.value)}
            placeholder={t({ en: 'Your certificate — {{name}}', es: 'Tu certificado, {{name}}' })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            {locale === 'es' ? (
              <>
                Puedes usar <code className="rounded bg-gray-100 px-1">{'{{name}}'}</code> en el
                asunto.
              </>
            ) : (
              <>
                You can use <code className="rounded bg-gray-100 px-1">{'{{name}}'}</code> in the
                subject.
              </>
            )}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t({ en: 'Message body', es: 'Mensaje' })}
          </label>
          <textarea
            rows={8}
            value={emailConfig.body}
            onChange={(e) => update('body', e.target.value)}
            placeholder={t({
              en: `Hi {{name}},\n\nCongratulations on completing the course. Your certificate is attached.\n\nBest regards!`,
              es: `Hola {{name}},\n\n¡Felicitaciones por completar el curso! Te adjuntamos tu certificado.\n\nSaludos,`,
            })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t({ en: 'Available variable:', es: 'Variable disponible:' })}{' '}
            <code className="rounded bg-gray-100 px-1">{'{{name}}'}</code>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t({ en: 'Your email for replies', es: 'Tu correo para respuestas' })}{' '}
            <span className="font-normal text-gray-400">
              {t({ en: '(optional)', es: '(opcional)' })}
            </span>
          </label>
          <input
            type="email"
            value={emailConfig.replyTo ?? ''}
            onChange={(e) => update('replyTo', e.target.value)}
            placeholder={t({ en: 'you@school.org', es: 'tu@escuela.edu' })}
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
              ? t({
                  en: 'Enter a valid email or leave it empty.',
                  es: 'Escribe un correo válido o déjalo vacío.',
                })
              : t({
                  en: 'When a recipient hits Reply, their message comes to you.',
                  es: 'Cuando un destinatario responda, el mensaje te llegará a ti.',
                })}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {t({ en: 'Verification & sharing', es: 'Verificación y LinkedIn' })}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {t({
                en: "Each recipient gets a public page with a unique certificate ID that proves it's real, plus a one-click button to add it to LinkedIn. Free, no account needed.",
                es: 'Cada destinatario recibe una página pública con un ID único que demuestra que su certificado es real, y un botón para agregarlo a LinkedIn con un clic. Gratis y sin cuenta.',
              })}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={verificationOn}
            aria-label={t({ en: 'Verification pages', es: 'Páginas de verificación' })}
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
              <label className="block text-sm font-medium text-gray-700">
                {t({ en: 'Certificate name', es: 'Nombre del certificado' })}
              </label>
              <input
                type="text"
                value={emailConfig.certificateName ?? ''}
                onChange={(e) => update('certificateName', e.target.value)}
                placeholder={t({
                  en: 'e.g. Teaching Smarter with AI',
                  es: 'p. ej. Enseñar mejor con IA',
                })}
                maxLength={150}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t({ en: 'Issued by', es: 'Emitido por' })}
              </label>
              <input
                type="text"
                value={emailConfig.issuerName ?? ''}
                onChange={(e) => update('issuerName', e.target.value)}
                placeholder={t({
                  en: 'e.g. your school or organization',
                  es: 'p. ej. tu escuela u organización',
                })}
                maxLength={150}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 sm:col-span-2">
              {t({
                en: "Shown on the verification page and prefilled when recipients add the certificate to LinkedIn. We store the recipient's name, never their email.",
                es: 'Se muestra en la página de verificación y se completa solo cuando los destinatarios agregan el certificado a LinkedIn. Guardamos el nombre del destinatario, nunca su correo.',
              })}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-gray-500">
            {t({
              en: 'No verification pages will be created, and nothing about these certificates is stored.',
              es: 'No se crearán páginas de verificación y no guardaremos nada sobre estos certificados.',
            })}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
        <p>
          📬{' '}
          {t({
            en: 'All emails are sent from the SendCert sender. A short footer is added to each outgoing message so your recipients know where the certificate came from.',
            es: 'Todos los correos salen desde el remitente de SendCert. Agregamos un pie breve a cada mensaje para que tus destinatarios sepan de dónde viene el certificado.',
          })}
        </p>
      </div>
    </div>
  );
}
