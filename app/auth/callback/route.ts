import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import type { EmailOtpType } from '@supabase/supabase-js';
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { logEvent } from '@/lib/events';
import { isTrustedPreviewHost } from '@/lib/siteUrl';

export const runtime = 'nodejs';

const OTP_TYPES: EmailOtpType[] = ['email', 'magiclink', 'signup', 'invite', 'recovery', 'email_change'];

/**
 * Where to go after signing in. Only same-site paths, so the login link can't
 * become an open redirect. Also accepts our own absolute callback URL, which
 * is what the email template passes as `next` ({{ .RedirectTo }}).
 */
function resolveNext(raw: string | null, host: string, depth = 0): string {
  if (!raw) return '/dashboard';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const url = new URL(raw);
    const sameSite = url.host === host || url.host.replace(/^www\./, '') === host.replace(/^www\./, '');
    if (!sameSite) return '/dashboard';
    if (url.pathname === '/auth/callback' && depth === 0) {
      return resolveNext(url.searchParams.get('next'), host, 1);
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return '/dashboard';
  }
}

/** Short reason code shown on the login page (see LoginPage). */
function failureReason(message: string): 'other_browser' | 'link_expired' | 'failed' {
  if (/code verifier|pkce|flow state/i.test(message)) return 'other_browser';
  if (/expired|invalid|already been used|otp|not found/i.test(message)) return 'link_expired';
  return 'failed';
}

/**
 * Magic-link callback. Two link formats:
 *  - token_hash + type (current email template): verified server-side, so it
 *    works on any device or browser, not only where the link was requested.
 *  - code (PKCE, older emails): needs the code verifier cookie from the
 *    browser that requested the link.
 */
/**
 * The email template always links to production ({{ .SiteURL }}). When the
 * sign-in was requested on a Vercel preview (or localhost), `next` is that
 * domain's callback: pass the unused token on so the session opens there.
 */
function previewHandoff(url: URL): URL | null {
  const raw = url.searchParams.get('next');
  const tokenHash = url.searchParams.get('token_hash');
  if (!raw || !tokenHash || raw.startsWith('/')) return null;
  try {
    const target = new URL(raw);
    if (target.host === url.host || !isTrustedPreviewHost(target.host) || target.pathname !== '/auth/callback') return null;
    target.searchParams.set('token_hash', tokenHash);
    target.searchParams.set('type', url.searchParams.get('type') ?? 'email');
    return target;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const handoff = previewHandoff(url);
  if (handoff) return NextResponse.redirect(handoff);
  const next = resolveNext(url.searchParams.get('next'), url.host);
  const loginPath = next.startsWith('/es') ? '/es/login' : '/login';
  const tokenHash = url.searchParams.get('token_hash');
  const typeParam = url.searchParams.get('type');
  const code = url.searchParams.get('code');
  const flow = tokenHash ? 'token_hash' : code ? 'pkce' : 'none';

  const fail = async (reason: string, message: string) => {
    await logEvent('auth.callback_failed', {
      level: 'error',
      message,
      path: '/auth/callback',
      detail: { flow, reason },
    });
    const target = new URL(loginPath, url);
    target.searchParams.set('error', reason);
    if (next !== '/dashboard') target.searchParams.set('next', next);
    return NextResponse.redirect(target);
  };

  if (!isSupabaseConfigured()) return fail('failed', 'Supabase is not configured');

  // Supabase sends errors back as query params (e.g. an expired link).
  const providerError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (providerError && !code && !tokenHash) {
    const errorCode = url.searchParams.get('error_code') ?? '';
    return fail(/expired/i.test(errorCode + providerError) ? 'link_expired' : 'failed', `${errorCode} ${providerError}`.trim());
  }
  if (flow === 'none') return fail('link_expired', 'Callback without code or token_hash');

  const cookieStore = cookies();
  const supabase = createServerSupabaseClient({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet) => {
      // The cookies() store mutates in place. We forward each option set so
      // Supabase's session cookie + helpers all stick.
      for (const c of toSet) {
        cookieStore.set({ name: c.name, value: c.value, ...c.options });
      }
    },
  });

  let userId: string | null = null;
  if (tokenHash) {
    const type = (OTP_TYPES as string[]).includes(typeParam ?? '') ? (typeParam as EmailOtpType) : 'email';
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail(failureReason(error.message), error.message);
    userId = data.user?.id ?? null;
  } else {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code!);
    if (error) return fail(failureReason(error.message), error.message);
    userId = data.user?.id ?? null;
  }

  await logEvent('auth.signed_in', { level: 'info', path: '/auth/callback', detail: { flow }, userId });
  return NextResponse.redirect(new URL(next, url));
}
