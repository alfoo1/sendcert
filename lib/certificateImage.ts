import sharp from 'sharp';
import type { CertificateExtraField, PdfFontFamily } from '@/lib/pdf';

// Mirrors lib/pdf.ts but produces a PNG instead of a PDF. The output is what
// gets stored as certificates_issued.certificate_image_url so the public
// /verify/[id] page can render the certificate as an <img>.
//
// Implementation: sharp reads the template image, an SVG overlay is built
// with the recipient name (and any extra text fields) at the configured
// positions, and the two are composited.

export type CertificateImageConfig = {
  imageBuffer: Buffer;
  name: string;
  x: number; // percent (center origin)
  y: number;
  fontSize: number;
  color: string;
  fontFamily?: PdfFontFamily;
  extraFields?: CertificateExtraField[];
};

const FAMILY_TO_SVG_FONT: Record<PdfFontFamily, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  times: 'Georgia, "Times New Roman", serif',
  courier: 'ui-monospace, "Courier New", monospace',
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildTextNode(opts: {
  text: string;
  xPct: number;
  yPct: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  fontFamily?: PdfFontFamily;
}): string {
  const cx = (opts.xPct / 100) * opts.width;
  const cy = (opts.yPct / 100) * opts.height;
  const fontFamily = FAMILY_TO_SVG_FONT[opts.fontFamily ?? 'helvetica'];
  // dominant-baseline=central + text-anchor=middle gives us a true center
  // anchor, matching how pdf-lib draws text on the PDF.
  return `<text x="${cx}" y="${cy}" font-family="${fontFamily}" font-size="${opts.fontSize}" font-weight="700" fill="${opts.color}" text-anchor="middle" dominant-baseline="central">${escapeXml(opts.text)}</text>`;
}

export async function generateCertificateImagePng(
  config: CertificateImageConfig,
): Promise<Buffer> {
  // Normalize the input (handles SVG/JPG/PNG) and read its dimensions so the
  // SVG overlay maps percent → pixels correctly.
  const baseline = sharp(config.imageBuffer);
  const meta = await baseline.metadata();
  const width = meta.width ?? 1200;
  const height = meta.height ?? 900;

  const overlays: string[] = [];
  overlays.push(
    buildTextNode({
      text: config.name,
      xPct: config.x,
      yPct: config.y,
      width,
      height,
      fontSize: config.fontSize,
      color: config.color,
      fontFamily: config.fontFamily,
    }),
  );
  for (const extra of config.extraFields ?? []) {
    overlays.push(
      buildTextNode({
        text: extra.text,
        xPct: extra.x,
        yPct: extra.y,
        width,
        height,
        fontSize: extra.fontSize,
        color: extra.color,
        fontFamily: extra.fontFamily,
      }),
    );
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${overlays.join('')}</svg>`;

  return sharp(config.imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
