import {
  createBrowserClient,
  createServerClient,
  type CookieOptions,
} from '@supabase/ssr';
import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';

// All three flavours read from the same env vars. Any of them being unset
// means Supabase isn't configured — callers must check `isSupabaseConfigured`
// before using the clients, otherwise the app will crash. Guest-mode flows
// must keep working in that state.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function isSupabaseServiceConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Browser client. Use inside `'use client'` components for things like
 * signing the user in via magic link.
 */
export function createBrowserSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Server-side client backed by Next's cookies() API. Use inside Server
 * Components, route handlers, and middleware. The cookie adapters keep the
 * session in sync with the browser.
 */
export function createServerSupabaseClient(cookies: {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: { name: string; value: string; options?: CookieOptions }[],
  ) => void;
}) {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: cookies.getAll,
      setAll: cookies.setAll,
    },
  });
}

/**
 * Service-role client. Bypasses RLS — never expose the resulting client to
 * the browser. Used by:
 *   - /api/send-emails to insert certificates_issued and bump usage counters
 *     for arbitrary users.
 *   - /verify/[id] to read certificate metadata without leaking the table to
 *     anonymous SELECTs.
 */
export function createServiceSupabaseClient(): SupabaseClient {
  if (!isSupabaseServiceConfigured()) {
    throw new Error(
      'Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.',
    );
  }
  return createSupabaseJsClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Helper for middleware / route handlers that need to read the current
 * session from a NextRequest. Reuses createServerSupabaseClient.
 */
export function createMiddlewareSupabaseClient(req: NextRequest, res: NextResponse) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set({ name, value, ...options });
          res.cookies.set({ name, value, ...options });
        });
      },
    },
  });
}
