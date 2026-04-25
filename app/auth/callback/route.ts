import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * OAuth / magic-link callback. Supabase redirects here with a `code`
 * parameter that we exchange for a session before redirecting the user to
 * the dashboard (or wherever they came from via `?next`).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/login?error=not_configured', url));
  }
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url));
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url),
    );
  }

  return NextResponse.redirect(new URL(next, url));
}
