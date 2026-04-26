'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from '@/lib/supabase';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Magic-link only — no passwords. The button always disables itself after a
// single submit so a curious user can't spam OTPs.
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    | { phase: 'idle' }
    | { phase: 'sending' }
    | { phase: 'sent' }
    | { phase: 'error'; message: string }
  >({ phase: 'idle' });

  const supabaseConfigured = isSupabaseConfigured();

  // Surface missing Supabase config to the developer console in dev — but
  // never to the end user. A visible yellow box on the login page would be
  // confusing for visitors and noisy for the owner once they've moved on.
  useEffect(() => {
    if (
      !supabaseConfigured &&
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        '[SendCert] Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to enable login.',
      );
    }
  }, [supabaseConfigured]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus({ phase: 'sending' });
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });
      if (error) throw error;
      setStatus({ phase: 'sent' });
    } catch (err) {
      setStatus({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong.',
      });
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xl font-bold"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            S
          </span>
          SendCert
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">
          Sign in or create your account
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Enter your email and we&apos;ll send you a magic link. No password
          needed. New here? We&apos;ll create your account automatically.
        </p>

        {status.phase === 'sent' ? (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <p className="font-semibold">Check your email</p>
            <p className="mt-1">
              We just sent a login link to <strong>{email}</strong>. Click it from
              your inbox and you&apos;ll be signed in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={!supabaseConfigured || status.phase === 'sending'}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              />
            </label>
            <button
              type="submit"
              disabled={!supabaseConfigured || status.phase === 'sending'}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status.phase === 'sending' ? 'Sending…' : 'Send me a magic link →'}
            </button>
            {status.phase === 'error' && (
              <p className="text-xs text-red-600">{status.message}</p>
            )}
          </form>
        )}

        <div className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-500">
          <p>
            Login is optional — you can{' '}
            <Link href="/app" className="font-medium text-brand-600 underline">
              use SendCert as a guest
            </Link>{' '}
            without an account.
          </p>
        </div>
      </div>
    </main>
  );
}
