import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceSupabaseClient,
  isSupabaseServiceConfigured,
} from '@/lib/supabase';
import { getLoggedInUserId } from '@/lib/session';
import { notifyOwner } from '@/lib/notify';

export const runtime = 'nodejs';

function formatStars(rating: number): string {
  return `${'⭐'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)`;
}

export async function POST(req: NextRequest) {
  const { rating, comment, recipientCount } = (await req.json()) as {
    rating?: number;
    comment?: string;
    recipientCount?: number;
  };

  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: 'Rating must be a whole number between 1 and 5.' },
      { status: 400 },
    );
  }

  const cleanComment = typeof comment === 'string' ? comment.trim().slice(0, 2000) : '';
  const count = typeof recipientCount === 'number' ? recipientCount : 0;
  const userId = await getLoggedInUserId();

  // Store and notify independently: either one succeeding is enough, and
  // feedback is optional, so the user always gets a success response.
  if (isSupabaseServiceConfigured()) {
    const { error } = await createServiceSupabaseClient().from('feedback').insert({
      rating,
      comment: cleanComment || null,
      recipient_count: count,
      user_id: userId,
    });
    if (error) console.error('feedback insert failed:', error);
  }

  try {
    await notifyOwner(
      `SendCert feedback — ${rating} star${rating === 1 ? '' : 's'}`,
      [
        `Rating: ${formatStars(rating)}`,
        `Comment: ${cleanComment || 'No comment'}`,
        `Recipients in that session: ${count}`,
        `Account: ${userId ? 'signed in' : 'guest'}`,
        `Submitted: ${new Date().toISOString()}`,
      ].join('\n'),
    );
  } catch (err) {
    console.error('feedback notification failed:', err);
  }

  return NextResponse.json({ ok: true });
}
