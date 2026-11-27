import { NextResponse, type NextRequest } from 'next/server';
import {
  createMiddlewareSupabaseClient,
  isSupabaseConfigured,
} from '@/lib/supabase';

// Routes that require an authenticated user. Anything else falls through.
const PROTECTED_PREFIXES = ['/dashboard', '/es/panel', '/admin'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Single-purpose middleware: gate /dashboard behind a Supabase session.
 * Everything else (landing, /app, /blog, /verify, /login, /faq) is public.
 *
 * If Supabase isn't configured we let every request through — the dashboard
 * page itself will render an empty state explaining setup.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();
  if (!isSupabaseConfigured()) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL(pathname.startsWith('/es/') ? '/es/login' : '/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

// Limit the matcher to the protected prefixes for performance — Next runs
// middleware on every request that matches, so excluding static assets and
// public pages keeps things snappy.
export const config = {
  matcher: ['/dashboard/:path*', '/es/panel/:path*', '/admin/:path*'],
};
