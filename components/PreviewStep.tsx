'use client';

import { useEffect, useRef, useState } from 'react';
import type { TextConfig } from './ConfigStep';
import type { Recipient } from './StudentsStep';
import type { EmailConfig } from './EmailStep';
import type { ExtraField } from '@/lib/extraFields';
import { isValidEmail } from '@/lib/validation';
import WaitlistModal from './WaitlistModal';
import FeedbackModal from './FeedbackModal';
import { trackEvent } from './Analytics';
import { useLocale, useTx } from '@/components/i18n/LocaleProvider';
import { localizePath, tx, type Locale } from '@/lib/i18n';

type Props = {
  templateDataUrl: string | null;
  templateId: string | null;
  textConfig: TextConfig;
  extraFields: ExtraField[];
  recipients: Recipient[];
  emailConfig: EmailConfig;
  // Navigational callbacks fired from the success screen.
  onResetAll: () => void;
  onResetAudience: () => void;
  // 'custom' for an uploaded design, otherwise the built-in template id.
  templateKind: string;
  // Language of the wizard; sent to the API so emails and verification pages
  // match. Defaults to the LocaleProvider's locale.
  locale?: Locale;
};

// Converts UI-side extra fields to the wire shape the API expects.
// Empty values are filtered out — no sense in asking pdf-lib to render "".
function toApiExtraFields(fields: ExtraField[]) {
  return fields
    .filter((f) => f.value.trim().length > 0)
    .map((f) => ({
      text: f.value,
      x: f.x,
      y: f.y,
      fontSize: f.fontSize,
      color: f.color,
      fontFamily: f.fontFamily,
    }));
}

type ResultEntry = {
  email: string;
  name: string;
  status: 'ok' | 'error';
  error?: string;
  // Populated for logged-in users when the certificate was persisted.
  verifyId?: string;
};

type SendState =
  | { phase: 'idle' }
  | {
      phase: 'sending';
      total: number;
      completed: number;
      startedAt: number;
      results: ResultEntry[];
      loggedIn: boolean;
    }
  | {
      phase: 'done';
      sent: number;
      failed: number;
      results: ResultEntry[];
      loggedIn: boolean;
    }
  | { phase: 'error'; message: string };

// Parses a web ReadableStream carrying Server-Sent Events. Yields one JSON
// object per `data:` line.
async function* parseEventStream<T>(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE delimiter is a blank line (double newline).
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
      for (const chunk of chunks) {
        const line = chunk
          .split('\n')
          .find((l) => l.startsWith('data: '));
        if (line) {
          try {
            yield JSON.parse(line.slice(6)) as T;
          } catch {
            // Ignore malformed chunks — stream stays alive for the next event.
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Format seconds as "≈ 12s" / "≈ 1m 30s" depending on magnitude.
function formatEta(seconds: number, locale: Locale): string {
  if (seconds < 60) {
    const s = Math.ceil(seconds);
    return tx(locale, { en: `≈ ${s}s remaining`, es: `≈ ${s} s restantes` });
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return tx(locale, {
    en: `≈ ${mins}m ${secs}s remaining`,
    es: `≈ ${mins} min ${secs} s restantes`,
  });
}

// Triggers a client-side CSV download with the failed recipients so the user
// can fix their CSV and retry.
function downloadFailedCsv(results: ResultEntry[], locale: Locale) {
  const failed = results.filter((r) => r.status === 'error');
  if (failed.length === 0) return;
  // Spanish headers are accepted by StudentsStep, so the file can be re-uploaded.
  const header = tx(locale, { en: 'name,email,error', es: 'nombre,correo,error' });
  const rows = failed.map(
    (r) =>
      `"${r.name.replace(/"/g, '""')}","${r.email.replace(/"/g, '""')}","${(r.error ?? '').replace(/"/g, '""')}"`,
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = tx(locale, {
    en: 'failed-recipients.csv',
    es: 'destinatarios-con-error.csv',
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function PreviewStep({
  templateDataUrl,
  templateId,
  textConfig,
  extraFields,
  recipients,
  emailConfig,
  onResetAll,
  onResetAudience,
  templateKind,
  locale: localeProp,
}: Props) {
  const contextLocale = useLocale();
  const locale = localeProp ?? contextLocale;
  const t = (en: string, es: string) => tx(locale, { en, es });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sendState, setSendState] = useState<SendState>({ phase: 'idle' });
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState('');
  const [waitlistTier, setWaitlistTier] = useState<'guest' | 'user'>('guest');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRecipientCount, setFeedbackRecipientCount] = useState(0);
  const completedSignatureRef = useRef<string | null>(null);

  const firstValid = recipients.find((r) => r.name && isValidEmail(r.email));
  const previewName = firstValid?.name ?? (locale === 'es' ? 'María González' : 'Maria Johnson');

  // Test-email state
  const [testName, setTestName] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<
    | { phase: 'idle' }
    | { phase: 'sending' }
    | { phase: 'success' }
    | { phase: 'error'; message: string }
  >({ phase: 'idle' });

  useEffect(() => {
    if (!testName && firstValid?.name) setTestName(firstValid.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstValid?.name]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function run() {
      setPreviewLoading(true);
      try {
        const res = await fetch('/api/generate-certificate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateDataUrl,
            templateId,
            name: previewName,
            ...textConfig,
            extraFields: toApiExtraFields(extraFields),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error ?? t('Could not generate preview', 'No pudimos generar la vista previa'),
          );
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setPreviewUrl(objectUrl);
          setPreviewError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setPreviewUrl(null);
          setPreviewError(
            err instanceof Error
              ? err.message
              : t('Could not generate preview', 'No pudimos generar la vista previa'),
          );
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }
    run();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    templateDataUrl,
    templateId,
    previewName,
    textConfig.x,
    textConfig.y,
    textConfig.fontSize,
    textConfig.color,
    textConfig.fontFamily,
    extraFields,
  ]);

  const validRecipients = recipients.filter(
    (r) => r.name && isValidEmail(r.email),
  );

  // Side-effects on a successful completion: fire analytics once, and open the
  // feedback modal only when EVERY recipient succeeded.
  useEffect(() => {
    if (sendState.phase !== 'done' || sendState.sent <= 0) return;
    const signature = `${sendState.sent}-${sendState.failed}`;
    if (completedSignatureRef.current === signature) return;
    completedSignatureRef.current = signature;

    trackEvent('certificates_sent', { recipientCount: sendState.sent });
    if (sendState.failed === 0) {
      setFeedbackRecipientCount(sendState.sent);
      setFeedbackOpen(true);
    }
  }, [sendState]);

  async function handleSend() {
    if (validRecipients.length === 0) {
      setSendState({
        phase: 'error',
        message: t('No valid recipients to send to.', 'No hay destinatarios válidos para enviar.'),
      });
      return;
    }
    const startedAt = Date.now();
    setSendState({
      phase: 'sending',
      total: validRecipients.length,
      completed: 0,
      startedAt,
      results: [],
      loggedIn: false, // refined when the 'start' event arrives
    });
    try {
      const res = await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateDataUrl,
          templateId,
          recipients: validRecipients,
          textConfig,
          emailConfig,
          extraFields: toApiExtraFields(extraFields),
          templateKind,
          locale,
        }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setSendState({ phase: 'idle' });
        setWaitlistMessage(
          data.error ??
            t("You've reached this month's free limit.", 'Llegaste al límite gratuito de este mes.'),
        );
        setWaitlistTier(data.tier === 'user' ? 'user' : 'guest');
        setWaitlistOpen(true);
        return;
      }

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setSendState({
          phase: 'error',
          message: data.error ?? t('Sending failed.', 'No se pudo completar el envío.'),
        });
        return;
      }

      // Accumulate stream events into local state. We read from the generator
      // in a plain loop so React can batch renders between events.
      const accumulated: ResultEntry[] = [];
      let total = validRecipients.length;
      let sent = 0;
      let failed = 0;
      let loggedIn = false;

      for await (const event of parseEventStream<
        | { type: 'start'; total: number; loggedIn?: boolean }
        | { type: 'progress'; completed: number; total: number; result: ResultEntry }
        | { type: 'done'; sent: number; failed: number }
      >(res.body)) {
        if (event.type === 'start') {
          total = event.total;
          loggedIn = Boolean(event.loggedIn);
        } else if (event.type === 'progress') {
          accumulated.push(event.result);
          if (event.result.status === 'ok') sent += 1;
          else failed += 1;
          setSendState({
            phase: 'sending',
            total: event.total,
            completed: event.completed,
            startedAt,
            results: [...accumulated],
            loggedIn,
          });
        } else if (event.type === 'done') {
          setSendState({
            phase: 'done',
            sent: event.sent,
            failed: event.failed,
            results: [...accumulated],
            loggedIn,
          });
        }
      }

      // Defensive: if the stream closed without a 'done' event, coerce a done
      // state from what we accumulated so the UI never gets stuck in 'sending'.
      setSendState((prev) => {
        if (prev.phase === 'sending') {
          return {
            phase: 'done',
            sent,
            failed,
            results: accumulated,
            loggedIn: prev.loggedIn,
          };
        }
        return prev;
      });
      void total;
    } catch (err) {
      setSendState({
        phase: 'error',
        message: err instanceof Error ? err.message : t('Unknown error.', 'Error desconocido.'),
      });
    }
  }

  async function handleSendTest() {
    const name = testName.trim();
    const email = testEmail.trim();
    if (!name) {
      setTestStatus({
        phase: 'error',
        message: t('Enter a name for the test.', 'Escribe un nombre para la prueba.'),
      });
      return;
    }
    if (!isValidEmail(email)) {
      setTestStatus({
        phase: 'error',
        message: t('Enter a valid email address.', 'Escribe un correo válido.'),
      });
      return;
    }
    setTestStatus({ phase: 'sending' });
    try {
      const res = await fetch('/api/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testName: name,
          testEmail: email,
          templateDataUrl,
          templateId,
          textConfig,
          emailConfig,
          extraFields: toApiExtraFields(extraFields),
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestStatus({
          phase: 'error',
          message:
            data.error ?? t('Could not send the test email.', 'No pudimos enviar el correo de prueba.'),
        });
        return;
      }
      setTestStatus({ phase: 'success' });
    } catch (err) {
      setTestStatus({
        phase: 'error',
        message: err instanceof Error ? err.message : t('Unknown error.', 'Error desconocido.'),
      });
    }
  }

  // Progress-derived values during a send.
  const isSending = sendState.phase === 'sending';
  const progressPct =
    isSending && sendState.total > 0
      ? Math.round((sendState.completed / sendState.total) * 100)
      : 0;
  const etaSeconds = (() => {
    if (!isSending || sendState.completed === 0) return null;
    const elapsed = (Date.now() - sendState.startedAt) / 1000;
    const avg = elapsed / sendState.completed;
    return avg * (sendState.total - sendState.completed);
  })();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t('Review and send', 'Revisa y envía')}
        </h2>
        <p className="mt-1 text-gray-600">
          {t(
            "This is how the certificate will look. When you're ready, send it to all your recipients.",
            'Así se verá el certificado. Cuando estés listo, envíalo a todos tus destinatarios.',
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- Left: preview ---------- */}
        <div>
          <div className="mb-2 text-sm font-medium text-gray-700">
            {t('Preview —', 'Vista previa:')} {previewName}
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            {previewLoading ? (
              <div className="flex h-full items-center justify-center text-gray-400">
                {t('Generating preview…', 'Generando vista previa…')}
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                title={t('Certificate preview', 'Vista previa del certificado')}
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-600">
                {previewError ?? t('Could not generate preview', 'No pudimos generar la vista previa')}
              </div>
            )}
          </div>
        </div>

        {/* ---------- Right: summary / send / success ---------- */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          {sendState.phase === 'done' && sendState.sent > 0 && sendState.failed === 0 ? (
            <SuccessPanel
              sent={sendState.sent}
              loggedIn={sendState.loggedIn}
              results={sendState.results}
              onResetAll={onResetAll}
              onResetAudience={onResetAudience}
            />
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('Send summary', 'Resumen del envío')}
              </h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">{t('Valid recipients', 'Destinatarios válidos')}</dt>
                  <dd className="font-semibold">{validRecipients.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">
                    {t('Recipients with errors', 'Destinatarios con errores')}
                  </dt>
                  <dd className="font-semibold text-red-600">
                    {recipients.length - validRecipients.length}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">{t('Subject', 'Asunto')}</dt>
                  <dd className="max-w-[60%] truncate font-mono text-xs">
                    {emailConfig.subject || '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">
                    {t('Verification pages', 'Páginas de verificación')}
                  </dt>
                  <dd className="font-semibold">
                    {emailConfig.verification === false
                      ? t('Off', 'Desactivadas')
                      : t('On', 'Activadas')}
                  </dd>
                </div>
              </dl>

              {/* Test-send card */}
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl leading-none">🧪</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {t('Send a test first', 'Primero envía una prueba')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t(
                        'See exactly how your recipients will get it.',
                        'Mira exactamente cómo lo recibirán tus destinatarios.',
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      {t('Name', 'Nombre')}
                    </label>
                    <input
                      type="text"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      placeholder={t('John Doe', 'Juan Pérez')}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      {t('Email', 'Correo')}
                    </label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder={t('you@example.com', 'tu@ejemplo.com')}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] leading-snug text-gray-500">
                    {t(
                      'This sends a real email only to you, not to your recipients list.',
                      'Esto envía un correo real solo a ti, no a tu lista de destinatarios.',
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={testStatus.phase === 'sending' || !testName.trim() || !testEmail.trim()}
                    className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {testStatus.phase === 'sending'
                      ? t('Sending…', 'Enviando…')
                      : t('Send test email →', 'Enviar prueba →')}
                  </button>
                </div>

                {testStatus.phase === 'success' && (
                  <p className="mt-2 text-xs font-medium text-green-700">
                    {t('✓ Test sent! Check your inbox.', '✓ ¡Prueba enviada! Revisa tu bandeja de entrada.')}
                  </p>
                )}
                {testStatus.phase === 'error' && (
                  <p className="mt-2 text-xs font-medium text-red-700">
                    ✗ {testStatus.message}
                  </p>
                )}
              </div>

              {/* Main CTA */}
              {!isSending && (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={validRecipients.length === 0}
                  className="mt-4 w-full rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {validRecipients.length === 1
                    ? t('Send to 1 recipient', 'Enviar a 1 destinatario')
                    : t(
                        `Send to ${validRecipients.length} recipients`,
                        `Enviar a ${validRecipients.length} destinatarios`,
                      )}
                </button>
              )}

              {/* Active send progress */}
              {isSending && (
                <SendingPanel
                  completed={sendState.completed}
                  total={sendState.total}
                  progressPct={progressPct}
                  etaSeconds={etaSeconds}
                />
              )}
            </>
          )}
        </div>
      </div>

      {sendState.phase === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          ❌ {sendState.message}
        </div>
      )}

      {/* Completion with at least one failure — show a detailed report + retry
          CSV. Full success hides this block because SuccessPanel already
          covers the UX. */}
      {sendState.phase === 'done' && sendState.failed > 0 && (
        <ResultsReport
          sent={sendState.sent}
          failed={sendState.failed}
          results={sendState.results}
          onDownloadFailed={() => downloadFailedCsv(sendState.results, locale)}
        />
      )}

      <WaitlistModal
        open={waitlistOpen}
        message={waitlistMessage}
        tier={waitlistTier}
        onClose={() => setWaitlistOpen(false)}
      />
      <FeedbackModal
        open={feedbackOpen}
        recipientCount={feedbackRecipientCount}
        onClose={() => setFeedbackOpen(false)}
      />
    </div>
  );
}

// ---------- Sub-components ----------

function SendingPanel({
  completed,
  total,
  progressPct,
  etaSeconds,
}: {
  completed: number;
  total: number;
  progressPct: number;
  etaSeconds: number | null;
}) {
  const locale = useLocale();
  const t = useTx();
  return (
    <div className="mt-4 rounded-lg border border-brand-200 bg-white p-4">
      <div className="flex items-center gap-3">
        {/* Spinner — CSS-only, no asset */}
        <svg
          className="h-5 w-5 shrink-0 animate-spin text-brand-600"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path
            d="M22 12a10 10 0 0 1-10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {t({ en: `Sending ${completed} of ${total}…`, es: `Enviando ${completed} de ${total}…` })}
          </p>
          {total > 5 && etaSeconds !== null && (
            <p className="text-xs text-gray-500">{formatEta(etaSeconds, locale)}</p>
          )}
        </div>
        <span className="shrink-0 text-sm font-semibold text-brand-700">
          {progressPct}%
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-brand-600 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

function SuccessPanel({
  sent,
  loggedIn,
  results,
  onResetAll,
  onResetAudience,
}: {
  sent: number;
  loggedIn: boolean;
  results: ResultEntry[];
  onResetAll: () => void;
  onResetAudience: () => void;
}) {
  const locale = useLocale();
  const t = useTx();
  const verifyHost =
    typeof window !== 'undefined'
      ? window.location.host
      : 'sendcert.org';
  const verified = results.filter((r) => r.status === 'ok' && r.verifyId);

  return (
    <div className="py-6 text-center">
      {/* Animated check — CSS keyframes (scale + stroke draw) */}
      <style jsx>{`
        @keyframes pop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          70% {
            transform: scale(1.1);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes draw {
          from {
            stroke-dashoffset: 40;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .check-circle {
          animation: pop 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        .check-path {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: draw 0.4s ease-out 0.2s forwards;
        }
      `}</style>

      <div className="mx-auto flex h-20 w-20 items-center justify-center">
        <svg viewBox="0 0 52 52" className="check-circle h-full w-full text-green-500">
          <circle cx="26" cy="26" r="24" fill="currentColor" opacity="0.15" />
          <circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            className="check-path"
            d="M14 27 l8 8 l16 -18"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="mt-4 text-xl font-bold text-gray-900">
        {t({
          en: `${sent} ${sent === 1 ? 'certificate' : 'certificates'} sent successfully!`,
          es: `¡${sent} ${sent === 1 ? 'certificado enviado' : 'certificados enviados'} con éxito!`,
        })}
      </p>
      <p className="mt-1 text-sm text-gray-600">
        {t({
          en: 'Your recipients should be receiving their emails in the next few minutes.',
          es: 'Tus destinatarios recibirán sus correos en los próximos minutos.',
        })}
      </p>

      {/* Every certificate with a verify ID (guests included) is listed so the
          sender can open or share the links. Guests also see a light nudge to
          create an account — the only place we mention auth in the core flow. */}
      {verified.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {t({ en: 'Verification links', es: 'Enlaces de verificación' })}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {t({
                  en: 'Each recipient got their link by email, with a button to add it to LinkedIn.',
                  es: 'Cada destinatario recibió su enlace por correo, con un botón para agregarlo a LinkedIn.',
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const text = verified
                  .map((r) => `${r.name}\t${window.location.origin}/verify/${r.verifyId}`)
                  .join('\n');
                navigator.clipboard?.writeText(text).catch(() => {});
              }}
              className="shrink-0 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {t({ en: 'Copy all', es: 'Copiar todos' })}
            </button>
          </div>
          <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-xs">
            {verified.map((r) => (
              <li
                key={r.verifyId}
                className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2 py-1.5 font-mono"
              >
                <span className="truncate text-gray-700">
                  {r.name} → {verifyHost}/verify/{r.verifyId}
                </span>
                <a
                  href={`/verify/${r.verifyId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-brand-600 underline"
                >
                  {t({ en: 'open', es: 'abrir' })}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loggedIn && (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4 text-left text-sm">
          <p className="font-semibold text-gray-900">
            {t({ en: 'Sending certificates often?', es: '¿Envías certificados seguido?' })}
          </p>
          <p className="mt-1 text-gray-700">
            {t({
              en: 'A free account raises your limit to 300 a month and keeps a history of every send. Just your email, no password.',
              es: 'Con una cuenta gratis tu límite sube a 300 por mes y guardas el historial de cada envío. Solo tu correo, sin contraseña.',
            })}
          </p>
          <a
            href={localizePath('/login', locale)}
            className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
          >
            {t({ en: 'Create a free account →', es: 'Crear una cuenta gratis →' })}
          </a>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onResetAudience}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          {t({
            en: 'Send same certificate to new recipients',
            es: 'Enviar el mismo certificado a otros destinatarios',
          })}
        </button>
        <button
          type="button"
          onClick={onResetAll}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          {t({ en: 'Send more certificates', es: 'Enviar más certificados' })}
        </button>
      </div>
    </div>
  );
}

function ResultsReport({
  sent,
  failed,
  results,
  onDownloadFailed,
}: {
  sent: number;
  failed: number;
  results: ResultEntry[];
  onDownloadFailed: () => void;
}) {
  const t = useTx();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <p className="font-semibold text-amber-900">
            {t({
              en: `${sent} sent successfully · ${failed} failed`,
              es: `${sent} enviados con éxito · ${failed} con error`,
            })}
          </p>
          <p className="text-sm text-amber-800">
            {t({
              en: 'Download the failed list, fix the issues, and re-upload only those rows.',
              es: 'Descarga la lista de fallidos, corrige los problemas y vuelve a subir solo esas filas.',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={onDownloadFailed}
          className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-50"
        >
          ⬇ {t({ en: 'Download failed list', es: 'Descargar lista de fallidos' })}
        </button>
      </div>

      <div className="max-h-72 overflow-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-2 font-medium">{t({ en: 'Name', es: 'Nombre' })}</th>
              <th className="px-4 py-2 font-medium">{t({ en: 'Email', es: 'Correo' })}</th>
              <th className="px-4 py-2 font-medium">{t({ en: 'Status', es: 'Estado' })}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.map((r, i) => (
              <tr key={i} className={r.status === 'ok' ? '' : 'bg-red-50'}>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.email}</td>
                <td className="px-4 py-2">
                  {r.status === 'ok' ? (
                    <span className="text-green-700">{t({ en: '✓ Sent', es: '✓ Enviado' })}</span>
                  ) : (
                    <span className="text-red-700" title={r.error}>
                      ✗ {r.error ?? 'Error'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
