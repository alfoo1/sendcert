import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceSupabaseClient,
  isSupabaseServiceConfigured,
} from '@/lib/supabase';

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
  return NextResponse.json({ ok: true });
}
