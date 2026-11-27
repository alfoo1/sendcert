import { getLoggedInUser } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * The organizer for event routes: the signed-in account. In local
 * development without Supabase there is no sign-in, so a fixed dev user
 * stands in (never in production).
 */
export async function getEventOwner(): Promise<{ id: string; email: string | null } | null> {
  const user = await getLoggedInUser();
  if (user) return user;
  if (!isSupabaseConfigured() && process.env.NODE_ENV === 'development') {
    return { id: 'dev-user', email: 'dev@localhost' };
  }
  return null;
}
