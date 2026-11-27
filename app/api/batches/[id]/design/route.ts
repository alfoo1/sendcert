import { NextResponse } from 'next/server';
import { getBatchDesign } from '@/lib/account';
import { getLoggedInUser } from '@/lib/session';
import { isSupabaseServiceConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The design and message of one of the signed-in user's sends, for
 * "Send again with this design" (/app?batch=<id>).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getLoggedInUser();
  if (!user || !isSupabaseServiceConfigured()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const design = await getBatchDesign(user.id, params.id);
  if (!design) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(design, { headers: { 'Cache-Control': 'no-store' } });
}
