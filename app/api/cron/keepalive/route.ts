import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceSupabaseClient,
  isSupabaseServiceConfigured,
} from '@/lib/supabase';
import { deleteExpiredDrafts } from '@/lib/aiDrafts';
import { deleteExpiredEvents } from '@/lib/eventMode/store';
import { buildDigest, deleteOldEvents, recentEvents } from '@/lib/events';
import { notifyOwner } from '@/lib/notify';
import { deleteOldBlockedSends } from '@/lib/abuseGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Daily Vercel cron (see vercel.json). Supabase's free tier pauses projects
 * after a week without database activity; one cheap query a day prevents it.
 * If CRON_SECRET is set in Vercel, only Vercel's scheduler can call this.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSupabaseServiceConfigured()) {
    return NextResponse.json({ ok: false, reason: 'Supabase not configured' });
  }

  const { error } = await createServiceSupabaseClient()
    .from('users')
    .select('id', { count: 'exact', head: true });
  if (error) {
    console.error('keepalive query failed:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  // Drafts from AI assistants hold recipient emails; drop them once expired.
  await deleteExpiredDrafts();
  await deleteOldEvents(90);
  // Text of blocked (abusive) sends is only kept 30 days.
  await deleteOldBlockedSends();
  // Events and their invitees are deleted 12 months after the event.
  await deleteExpiredEvents();

  // Daily email to the owner with the last 24 h of problems and sign-ins,
  // so failures users hit don't go unnoticed. Skipped on quiet days.
  // Only from Vercel's scheduler (or with the secret), so hitting the URL by
  // hand can't flood the owner's inbox.
  const fromScheduler =
    Boolean(secret) || (req.headers.get('user-agent') ?? '').toLowerCase().startsWith('vercel-cron');
  let digestSent = false;
  const digest = fromScheduler ? buildDigest(await recentEvents(new Date(Date.now() - 86_400_000))) : null;
  if (digest) {
    try {
      await notifyOwner(digest.subject, digest.body);
      digestSent = true;
    } catch (err) {
      console.error('Daily digest email failed:', err);
    }
  }
  return NextResponse.json({ ok: true, digestSent });
}
