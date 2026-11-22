import { NextResponse } from 'next/server';
import { getDraft } from '@/lib/aiDrafts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns a draft prepared by an AI assistant so the wizard can load it
 * (/app?draft=<id>). The id is the secret: unguessable and short-lived.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const draft = await getDraft(params.id);
  if (!draft) {
    return NextResponse.json(
      { error: 'not_found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.json(draft, {
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
