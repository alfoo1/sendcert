import { NextRequest, NextResponse } from 'next/server';
import { addToWaitlist } from '@/lib/waitlist';
import { isValidEmail } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * Stores a user email for notification when premium plans launch.
 * Accepts { email, reason? } — reason helps us segment users later
 * (e.g. "rate-limit-hit" vs. organic signup).
 */
export async function POST(req: NextRequest) {
  try {
    const { email, reason } = (await req.json()) as {
      email?: string;
      reason?: string;
    };

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'A valid email is required.' },
        { status: 400 },
      );
    }

    await addToWaitlist(email.trim(), reason);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('waitlist error:', err);
    return NextResponse.json(
      { error: 'Could not save your email.' },
      { status: 500 },
    );
  }
}
