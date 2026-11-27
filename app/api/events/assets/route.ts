import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { getEventOwner } from '@/lib/eventMode/owner';
import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import { errorMessage, logEvent } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public Supabase Storage bucket for event images (logos, partner logos,
// share card backgrounds). Uploads only happen here, with the service role.
const BUCKET = 'event-assets';
const MAX_BYTES = 8 * 1024 * 1024;

type Kind = 'logo' | 'partner' | 'background';

/**
 * Uploads an event image (sent as a data URL), normalized with sharp:
 * logos to PNG up to 800 px, backgrounds to JPEG up to 1350 px tall.
 * Returns its public URL and size. Falls back to a data URL when Storage
 * isn't available (local development, or the bucket missing).
 */
export async function POST(req: NextRequest) {
  const owner = await getEventOwner();
  if (!owner) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  let kind: Kind;
  let input: Buffer;
  try {
    const body = (await req.json()) as { dataUrl?: unknown; kind?: unknown };
    kind = body.kind === 'background' ? 'background' : body.kind === 'partner' ? 'partner' : 'logo';
    const match = typeof body.dataUrl === 'string' ? body.dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/) : null;
    if (!match) return NextResponse.json({ error: 'Use a PNG, JPG or WebP image.' }, { status: 400 });
    input = Buffer.from(match[2], 'base64');
    if (input.length > MAX_BYTES) return NextResponse.json({ error: 'The image is larger than 8 MB.' }, { status: 413 });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  let out: Buffer;
  let contentType: string;
  let width: number;
  let height: number;
  try {
    const meta = await sharp(input).metadata();
    if (kind === 'background') {
      if ((meta.width ?? 0) < 600 || (meta.height ?? 0) < 600) {
        return NextResponse.json({ error: 'The background must be at least 600 px wide and tall (ideally 1080×1350 or 1200×1200).' }, { status: 400 });
      }
      const { data, info } = await sharp(input)
        .rotate()
        .resize({ width: 1200, height: 1350, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 88 })
        .toBuffer({ resolveWithObject: true });
      out = data;
      width = info.width;
      height = info.height;
      contentType = 'image/jpeg';
    } else {
      const { data, info } = await sharp(input)
        .rotate()
        .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer({ resolveWithObject: true });
      out = data;
      width = info.width;
      height = info.height;
      contentType = 'image/png';
    }
  } catch {
    return NextResponse.json({ error: 'We could not read that image.' }, { status: 400 });
  }

  const dataUrl = `data:${contentType};base64,${out.toString('base64')}`;
  if (!isSupabaseServiceConfigured()) return NextResponse.json({ url: dataUrl, w: width, h: height });

  const path = `${owner.id}/${randomUUID()}.${contentType === 'image/png' ? 'png' : 'jpg'}`;
  const storage = createServiceSupabaseClient().storage.from(BUCKET);
  const { error } = await storage.upload(path, out, { contentType, upsert: false, cacheControl: '31536000' });
  if (error) {
    await logEvent('events.asset_upload_failed', { level: 'warn', message: errorMessage(error), path: '/api/events/assets', userId: owner.id });
    // Keeps the wizard usable until the bucket exists; small images only.
    if (out.length < 1_000_000) return NextResponse.json({ url: dataUrl, w: width, h: height });
    return NextResponse.json({ error: 'Image storage is not available right now.' }, { status: 503 });
  }
  return NextResponse.json({ url: storage.getPublicUrl(path).data.publicUrl, w: width, h: height });
}
