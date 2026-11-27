'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { localizePath, tx, type Locale } from '@/lib/i18n';
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { reportEvent } from '@/lib/clientEvents';

// Reasons the callback sends back as ?error= (see app/auth/callback/route.ts).
const CALLBACK_ERRORS: Record<string, { en: string; es: string }> = {
  other_browser: {
    en: 'That sign-in link was opened in a different browser or device than the one where you requested it. Request a new link below and open it on this device.',
    es: 'Ese enlace se abrió en un navegador o dispositivo distinto del que usaste para pedirlo. Pide un enlace nuevo aquí abajo y ábrelo en este dispositivo.',
  },
  link_expired: {
    en: 'That sign-in link has expired or was already used. Request a new one below.',
    es: 'Ese enlace de acceso venció o ya se usó. Pide uno nuevo aquí abajo.',
  },
  failed: {
    en: "We couldn't sign you in with that link. Request a new one below.",
    es: 'No pudimos iniciar tu sesión con ese enlace. Pide uno nuevo aquí abajo.',
  },
};

/** Friendlier text for errors Supabase returns when requesting a link. */
function requestErrorMessage(message: string, locale: Locale): string {
  if (/after \d+ seconds|rate limit|too many/i.test(message)) {
    return tx(locale, {
      en: 'Too many sign-in requests. Wait a minute and try again.',
      es: 'Demasiados pedidos de acceso. Espera un minuto y vuelve a intentarlo.',
    });
  }
  return message;
}

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Magic-link only — no passwords. The button always disables itself after a
// single submit so a curious user can't spam OTPs.
export default function LoginPage({ locale = 'en' }: { locale?: Locale }) {
  const t = (c: { en: string; es: string }) => tx(locale, c);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    | { phase: 'idle' }
    | { phase: 'sending' }
    | { phase: 'sent' }
    | { phase: 'error'; message: string }
  >({ phase: 'idle' });

  const supabaseConfigured = isSupabaseConfigured();

  // Error sent back by /auth/callback when a sign-in link didn't work.
  const [callbackError, setCallbackError] = useState<string | null>(null);
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('error');
    if (reason) setCallbackError(tx(locale, CALLBACK_ERRORS[reason] ?? CALLBACK_ERRORS.failed));
  }, [locale]);

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
          // Carry ?next (e.g. /admin) through the magic link; the callback
          // only accepts same-site paths.
          emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(
            new URLSearchParams(window.location.search).get('next') ?? '/dashboard',
          )}`,
        },
      });
      if (error) throw error;
      setCallbackError(null);
      setStatus({ phase: 'sent' });
      reportEvent('auth.link_requested');
    } catch (err) {
      const message = err instanceof Error ? err.message : t({ en: 'Something went wrong.', es: 'Algo salió mal.' });
      reportEvent('auth.link_request_failed', message);
      setStatus({ phase: 'error', message: requestErrorMessage(message, locale) });
    }
  }

  return (
    <LocaleProvider locale={locale}>
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <Link
          href={localizePath('/', locale)}
          className="mb-6 inline-flex items-center gap-2 text-xl font-bold"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            S
          </span>
          SendCert
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">
          {t({ en: 'Sign in or create your account', es: 'Inicia sesión o crea tu cuenta' })}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {t({
            en: "Enter your email and we'll send you a magic link. No password needed. New here? We'll create your account automatically.",
            es: 'Ingresa tu correo y te enviaremos un enlace mágico. No necesitas contraseña. ¿Eres nuevo? Creamos tu cuenta automáticamente.',
          })}
        </p>

        {callbackError && status.phase !== 'sent' && (
          <div role="alert" className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {callbackError}
          </div>
        )}

        {status.phase === 'sent' ? (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <p className="font-semibold">{t({ en: 'Check your email', es: 'Revisa tu correo' })}</p>
            <p className="mt-1">
              {t({ en: 'We just sent a login link to', es: 'Te enviamos un enlace de acceso a' })}{' '}
              <strong>{email}</strong>.{' '}
              {t({
                en: "Click it from your inbox and you'll be signed in.",
                es: 'Ábrelo desde tu bandeja de entrada y quedarás conectado.',
              })}
            </p>
            <p className="mt-2 text-xs text-green-800">
              {t({
                en: "Can't find it? Check your spam folder. The link works once and expires in an hour.",
                es: '¿No lo encuentras? Revisa la carpeta de spam. El enlace sirve una sola vez y vence en una hora.',
              })}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                {t({ en: 'Email', es: 'Correo electrónico' })}
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t({ en: 'you@example.com', es: 'tu@ejemplo.com' })}
                disabled={!supabaseConfigured || status.phase === 'sending'}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              />
            </label>
            <button
              type="submit"
              disabled={!supabaseConfigured || status.phase === 'sending'}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status.phase === 'sending'
                ? t({ en: 'Sending…', es: 'Enviando…' })
                : t({ en: 'Send me a magic link →', es: 'Enviarme un enlace mágico →' })}
            </button>
            {status.phase === 'error' && (
              <p className="text-xs text-red-600">{status.message}</p>
            )}
          </form>
        )}

        <div className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-500">
          <p>
            {t({ en: 'Login is optional. You can', es: 'Iniciar sesión es opcional. Puedes' })}{' '}
            <Link href={localizePath('/app', locale)} className="font-medium text-brand-600 underline">
              {t({ en: 'use SendCert as a guest', es: 'usar SendCert como invitado' })}
            </Link>{' '}
            {t({ en: 'without an account.', es: 'sin una cuenta.' })}
          </p>
        </div>
      </div>
    </main>
    </LocaleProvider>
  );
}
