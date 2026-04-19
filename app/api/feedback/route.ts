import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('feedback error:', err);
    return NextResponse.json(
      { error: 'Could not save feedback.' },
      { status: 500 },
    );
  }
}
