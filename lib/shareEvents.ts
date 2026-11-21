import {
  createServiceSupabaseClient,
  isSupabaseServiceConfigured,
} from '@/lib/supabase';

export type ShareKind = 'linkedin_add' | 'linkedin_share' | 'copy_link';

/** Counts a share-button click. Never throws: a failed log must not block the redirect. */
export async function logShareEvent(verifyId: string, kind: ShareKind, source: 'email' | 'page') {
  if (!isSupabaseServiceConfigured()) return;
  try {
    const { error } = await createServiceSupabaseClient()
      .from('share_events')
      .insert({ verify_id: verifyId, kind, source });
    if (error) console.error('share_events insert failed:', error);
  } catch (err) {
    console.error('share_events insert failed:', err);
  }
}
