import { cookies } from 'next/headers';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Returns the signed-in user's id from the Supabase session cookie, or null
 * for guests. Never throws: auth problems must not block guest flows.
 */
export async function getLoggedInUserId(): Promise<string | null> {
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
    return user?.id ?? null;
  } catch {
    return null;
  }
}
