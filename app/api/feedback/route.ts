import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createTransporter, loadSmtpConfigFromEnv, sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

type FeedbackEntry = {
  rating: number; // 1-5
  comment: string;
  recipientCount: number;
  timestamp: string; // ISO
};

// Feedback is persisted to a flat JSON file. Low volume / append-heavy fits the
// MVP without adding a database. Swap for a proper store when traffic warrants.
const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'feedback.json');

// Operator inbox — where feedback notifications land. Hard-coded by design so
// submissions land in a single place regardless of how end-users configure
// SMTP_REPLY_TO.
const NOTIFICATION_TO = 'aguileras.alfonso@gmail.com';

async function readAll(): Promise<FeedbackEntry[]> {
  try {
    const raw = await readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    throw err;
  }
}

// Builds the "⭐⭐⭐⭐ (4/5)" string used in the email body. Keeps the symbol
// rendering logic in one place.
function formatStars(rating: number): string {
  const filled = '⭐'.repeat(Math.max(0, Math.min(5, rating)));
  const empty = '☆'.repeat(Math.max(0, 5 - rating));
  return `${filled}${empty} (${rating}/5)`;
}

/**
 * Fire-and-forget notification to the operator. Wrapped in try/catch at the
 * call site so an SMTP hiccup never blocks the user from submitting feedback.
 */
async function sendFeedbackNotification(entry: FeedbackEntry): Promise<void> {
  const smtp = loadSmtpConfigFromEnv(); // throws if misconfigured
  const transporter = createTransporter(smtp);

  const subject = `SendCert feedback — ${entry.rating} star${entry.rating === 1 ? '' : 's'}`;
  const body = [
    `Rating: ${formatStars(entry.rating)}`,
    `Comment: ${entry.comment.trim() ? entry.comment.trim() : 'No comment'}`,
    `Recipients in that session: ${entry.recipientCount}`,
    `Submitted: ${entry.timestamp}`,
  ].join('\n');

  await sendMail(transporter, smtp, {
    to: NOTIFICATION_TO,
    subject,
    body,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { rating, comment, recipientCount } = (await req.json()) as {
      rating?: number;
      comment?: string;
      recipientCount?: number;
    };

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5.' },
        { status: 400 },
      );
    }

    const entry: FeedbackEntry = {
      rating,
      comment: typeof comment === 'string' ? comment.trim().slice(0, 2000) : '',
      recipientCount: typeof recipientCount === 'number' ? recipientCount : 0,
      timestamp: new Date().toISOString(),
    };

    await mkdir(DATA_DIR, { recursive: true });
    const all = await readAll();
    all.push(entry);
    await writeFile(FILE, JSON.stringify(all, null, 2), 'utf8');

    // Operator notification — best-effort. We deliberately do NOT await-then-
    // throw, since feedback should be recorded even if SMTP is down / not
    // configured locally. Errors are logged for the operator to investigate.
    try {
      await sendFeedbackNotification(entry);
    } catch (err) {
      console.error('Failed to send feedback notification email:', err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('feedback error:', err);
    return NextResponse.json(
      { error: 'Could not save feedback.' },
      { status: 500 },
    );
  }
}
