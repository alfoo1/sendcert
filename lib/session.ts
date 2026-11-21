import { cookies } from 'next/headers';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Returns the signed-in user from the Supabase session cookie, or null for
 * guests. Never throws: auth problems must not block guest flows.
 */
export async function getLoggedInUser(): Promise<{ id: string; email: string | null } | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const cookieStore = cookies();
    const supabase = createServerSupabaseClient({
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? { id: user.id, email: user.email ?? null } : null;
  } catch {
    return null;
  }
}

export async function getLoggedInUserId(): Promise<string | null> {
  return (await getLoggedInUser())?.id ?? null;
}

// Accounts allowed into /admin. Comma-separated override via ADMIN_EMAILS.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'aguileras.alfonso@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && ADMIN_EMAILS.includes(email!.toLowerCase());
}
