'use client';

import { useEffect, useRef, useState } from 'react';
import type { TextConfig } from './ConfigStep';
import type { Recipient } from './StudentsStep';
import type { EmailConfig } from './EmailStep';
import { isValidEmail } from '@/lib/validation';
import WaitlistModal from './WaitlistModal';
import FeedbackModal from './FeedbackModal';
import { trackEvent } from './Analytics';

type Props = {
  templateDataUrl: string | null;
  templateId: string | null;
  textConfig: TextConfig;
  recipients: Recipient[];
  emailConfig: EmailConfig;
  // Navigational callbacks fired from the success screen.
  onResetAll: () => void;
  onResetAudience: () => void;
};

type ResultEntry = {
  email: string;
  name: string;
  status: 'ok' | 'error';
  error?: string;
};

type SendState =
  | { phase: 'idle' }
  | {
      phase: 'sending';
      total: number;
      completed: number;
      startedAt: number;
      results: ResultEntry[];
    }
  | {
      phase: 'done';
      sent: number;
      failed: number;
      results: ResultEntry[];
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
function formatEta(seconds: number): string {
  if (seconds < 60) return `≈ ${Math.ceil(seconds)}s remaining`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `≈ ${mins}m ${secs}s remaining`;
}

// Triggers a client-side CSV download with the failed recipients so the user
// can fix their CSV and retry.
function downloadFailedCsv(results: ResultEntry[]) {
  const failed = results.filter((r) => r.status === 'error');
  if (failed.length === 0) return;
  const header = 'name,email,error';
  const rows = failed.map(
    (r) =>
      `"${r.name.replace(/"/g, '""')}","${r.email.replace(/"/g, '""')}","${(r.error ?? '').replace(/"/g, '""')}"`,
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'failed-recipients.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function PreviewStep({
  templateDataUrl,
  templateId,
  textConfig,
  recipients,
  emailConfig,
  onResetAll,
  onResetAudience,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendState, setSendState] = useState<SendState>({ phase: 'idle' });
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRecipientCount, setFeedbackRecipientCount] = useState(0);
  const completedSignatureRef = useRef<string | null>(null);

  const firstValid = recipients.find((r) => r.name && isValidEmail(r.email));
  const previewName = firstValid?.name ?? 'Maria Johnson';

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
          }),
        });
        if (!res.ok) throw new Error('Could not generate preview');
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setPreviewUrl(objectUrl);
      } catch {
        if (!cancelled) setPreviewUrl(null);
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
      setSendState({ phase: 'error', message: 'No valid recipients to send to.' });
      return;
    }
    const startedAt = Date.now();
    setSendState({
      phase: 'sending',
      total: validRecipients.length,
      completed: 0,
      startedAt,
      results: [],
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
        }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setSendState({ phase: 'idle' });
        setWaitlistMessage(
          data.error ?? "You've reached the 50-email free limit for this month.",
        );
        setWaitlistOpen(true);
        return;
      }

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setSendState({
          phase: 'error',
          message: data.error ?? 'Sending failed.',
        });
        return;
      }

      // Accumulate stream events into local state. We read from the generator
      // in a plain loop so React can batch renders between events.
      const accumulated: ResultEntry[] = [];
      let total = validRecipients.length;
      let sent = 0;
      let failed = 0;

      for await (const event of parseEventStream<
        | { type: 'start'; total: number }
        | { type: 'progress'; completed: number; total: number; result: ResultEntry }
        | { type: 'done'; sent: number; failed: number }
      >(res.body)) {
        if (event.type === 'start') {
          total = event.total;
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
          });
        } else if (event.type === 'done') {
          setSendState({
            phase: 'done',
            sent: event.sent,
            failed: event.failed,
            results: [...accumulated],
          });
        }
      }

      // Defensive: if the stream closed without a 'done' event, coerce a done
      // state from what we accumulated so the UI never gets stuck in 'sending'.
      setSendState((prev) => {
        if (prev.phase === 'sending') {
          return { phase: 'done', sent, failed, results: accumulated };
        }
        return prev;
      });
      void total;
    } catch (err) {
      setSendState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Unknown error.',
      });
    }
  }

  async function handleSendTest() {
    const name = testName.trim();
    const email = testEmail.trim();
    if (!name) {
      setTestStatus({ phase: 'error', message: 'Enter a name for the test.' });
      return;
    }
    if (!isValidEmail(email)) {
      setTestStatus({ phase: 'error', message: 'Enter a valid email address.' });
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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestStatus({
          phase: 'error',
          message: data.error ?? 'Could not send the test email.',
        });
        return;
      }
      setTestStatus({ phase: 'success' });
    } catch (err) {
      setTestStatus({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Unknown error.',
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
        <h2 className="text-2xl font-bold text-gray-900">Review and send</h2>
        <p className="mt-1 text-gray-600">
          This is how the certificate will look. When you're ready, send it to all your
          recipients.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- Left: preview ---------- */}
        <div>
          <div className="mb-2 text-sm font-medium text-gray-700">
            Preview — {previewName}
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            {previewLoading ? (
              <div className="flex h-full items-center justify-center text-gray-400">
                Generating preview…
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                title="Certificate preview"
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-red-500">
                Could not generate preview
              </div>
            )}
          </div>
        </div>

        {/* ---------- Right: summary / send / success ---------- */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          {sendState.phase === 'done' && sendState.sent > 0 && sendState.failed === 0 ? (
            <SuccessPanel
              sent={sendState.sent}
              onResetAll={onResetAll}
              onResetAudience={onResetAudience}
            />
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900">Send summary</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Valid recipients</dt>
                  <dd className="font-semibold">{validRecipients.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Recipients with errors</dt>
                  <dd className="font-semibold text-red-600">
                    {recipients.length - validRecipients.length}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Subject</dt>
                  <dd className="max-w-[60%] truncate font-mono text-xs">
                    {emailConfig.subject || '—'}
                  </dd>
                </div>
              </dl>

              {/* Test-send card */}
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl leading-none">🧪</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Send a test first
                    </p>
                    <p className="text-xs text-gray-500">
                      See exactly how your recipients will get it.
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Name</label>
                    <input
                      type="text"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      placeholder="John Doe"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Email</label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] leading-snug text-gray-500">
                    This sends a real email only to you, not to your recipients list.
                  </p>
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={testStatus.phase === 'sending' || !testName.trim() || !testEmail.trim()}
                    className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {testStatus.phase === 'sending' ? 'Sending…' : 'Send test email →'}
                  </button>
                </div>

                {testStatus.phase === 'success' && (
                  <p className="mt-2 text-xs font-medium text-green-700">
                    ✓ Test sent! Check your inbox.
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
                  Send to {validRecipients.length} recipients
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
          onDownloadFailed={() => downloadFailedCsv(sendState.results)}
        />
      )}

      <WaitlistModal
        open={waitlistOpen}
        message={waitlistMessage}
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
            Sending {completed} of {total}…
          </p>
          {total > 5 && etaSeconds !== null && (
            <p className="text-xs text-gray-500">{formatEta(etaSeconds)}</p>
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
  onResetAll,
  onResetAudience,
}: {
  sent: number;
  onResetAll: () => void;
  onResetAudience: () => void;
}) {
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
        {sent} {sent === 1 ? 'certificate' : 'certificates'} sent successfully!
      </p>
      <p className="mt-1 text-sm text-gray-600">
        Your recipients should be receiving their emails in the next few minutes.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onResetAudience}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Send same certificate to new recipients
        </button>
        <button
          type="button"
          onClick={onResetAll}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Send more certificates
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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <p className="font-semibold text-amber-900">
            {sent} sent successfully · {failed} failed
          </p>
          <p className="text-sm text-amber-800">
            Download the failed list, fix the issues, and re-upload only those rows.
          </p>
        </div>
        <button
          type="button"
          onClick={onDownloadFailed}
          className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-50"
        >
          ⬇ Download failed list
        </button>
      </div>

      <div className="max-h-72 overflow-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.map((r, i) => (
              <tr key={i} className={r.status === 'ok' ? '' : 'bg-red-50'}>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.email}</td>
                <td className="px-4 py-2">
                  {r.status === 'ok' ? (
                    <span className="text-green-700">✓ Sent</span>
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
