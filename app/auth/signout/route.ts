import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Signs the current user out by clearing the Supabase session cookie, then
 * redirects to the landing. Safe to call when not signed in (no-op).
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/', url));
  }
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet) => {
      for (const c of toSet) {
        cookieStore.set({ name: c.name, value: c.value, ...c.options });
      }
    },
  });
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', url));
}
