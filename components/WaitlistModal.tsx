'use client';

import { useState } from 'react';
import { isValidEmail } from '@/lib/validation';

type Props = {
  open: boolean;
  message: string;
  // Guests can lift the cap by creating a free account; signed-in users can
  // only join the premium waitlist.
  tier: 'guest' | 'user';
  onClose: () => void;
};

// Modal shown when the server returns 429 (monthly rate limit reached).
export default function WaitlistModal({ open, message, tier, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setStatus('error');
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setStatus('idle');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          reason: tier === 'guest' ? 'guest-limit-hit' : 'user-limit-hit',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not save your email.');
      }
      setStatus('ok');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl">
            ⏳
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              You've reached this month's free limit
            </h3>
            <p className="mt-1 text-sm text-gray-600">{message}</p>
          </div>
        </div>

        {tier === 'guest' && (
          <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm">
            <p className="font-semibold text-gray-900">
              Create a free account to keep sending
            </p>
            <p className="mt-1 text-gray-700">
              Sign in with your email in a new tab, then come back here and click
              Send again. Your certificate setup stays as it is.
            </p>
            <a
              href="/login"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Create a free account →
            </a>
          </div>
        )}

        {status === 'ok' ? (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            ✓ Thanks! We'll email you as soon as premium plans are available.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Get notified when premium launches
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {status === 'error' && errorMsg && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Notify me'}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-gray-500 underline hover:text-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
