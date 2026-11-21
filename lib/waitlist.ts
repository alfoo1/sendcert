import {
  createServiceSupabaseClient,
  isSupabaseServiceConfigured,
} from '@/lib/supabase';
import { notifyOwner } from '@/lib/notify';

/**
 * Saves a waitlist signup and emails the owner. Duplicates are ignored.
 * Throws only if neither the database nor the email notification worked,
 * so the signup is never silently lost.
 */
export async function addToWaitlist(email: string, reason?: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  let stored = false;
  let notified = false;

  if (isSupabaseServiceConfigured()) {
    const { error } = await createServiceSupabaseClient()
      .from('waitlist')
      .upsert({ email: normalized, reason: reason ?? null }, { onConflict: 'email', ignoreDuplicates: true });
    if (error) console.error('waitlist insert failed:', error);
    else stored = true;
  }

  try {
    await notifyOwner(
      'SendCert waitlist signup',
      `Email: ${normalized}\nReason: ${reason ?? '—'}\nSubmitted: ${new Date().toISOString()}`,
    );
    notified = true;
  } catch (err) {
    console.error('waitlist notification failed:', err);
  }

  if (!stored && !notified) {
    throw new Error('Could not save waitlist signup.');
  }
}
