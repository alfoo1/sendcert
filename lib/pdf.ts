import { PDFDocument, rgb, StandardFonts, type PDFFont } from 'pdf-lib';
import sharp from 'sharp';
import { CERT_WIDTH } from '@/lib/certificateSize';

export type PdfFontFamily = 'helvetica' | 'times' | 'courier';

// One free-floating piece of vector text overlaid on the certificate.
// Shares the same coordinate convention as the recipient name (percent, center origin).
export type CertificateExtraField = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily?: PdfFontFamily;
};

// Certificate generation input.
export type CertificateConfig = {
  // Base template image (JPG/PNG or rasterized SVG).
  imageBuffer: Buffer;
  // Recipient name.
  name: string;
  // Percent (0-100) relative to the image dimensions.
  x: number;
  y: number;
  // Font size in PDF points.
  fontSize: number;
  // Hex color (#RRGGBB).
  color: string;
  fontFamily?: PdfFontFamily;
  // Optional additional text overlays (signature, date, custom fields…)
  extraFields?: CertificateExtraField[];
};

/** Converts a hex color (#RRGGBB) to 0-1 RGB values used by pdf-lib. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const num = parseInt(
    clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean,
    16,
  );
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Normalizes the input image to PNG using sharp so pdf-lib can embed it
 * regardless of whether the source was JPG, PNG, or SVG.
 */
async function normalizeToPng(input: Buffer): Promise<Buffer> {
  return sharp(input).png().toBuffer();
}

// Letters whose accent-free form isn't produced by Unicode decomposition.
const LATIN_FALLBACKS: Record<string, string> = {
  ł: 'l', Ł: 'L', đ: 'd', Đ: 'D', ħ: 'h', Ħ: 'H', ı: 'i', ŧ: 't', Ŧ: 'T',
};

/**
 * The standard PDF fonts only cover Western European characters and throw on
 * anything else (e.g. "Nguyễn"). Characters they can't print fall back to
 * their accent-free letter. Names that would lose most of their letters
 * (another alphabet entirely) throw a readable error instead of producing a
 * certificate with a blank or mangled name.
 */
function toPrintable(text: string, charset: Set<number>): string {
  let out = '';
  let dropped = 0;
  for (const ch of text) {
    if (charset.has(ch.codePointAt(0)!)) {
      out += ch;
      continue;
    }
    const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (base && [...base].every((c) => charset.has(c.codePointAt(0)!))) {
      out += base;
    } else if (LATIN_FALLBACKS[ch]) {
      out += LATIN_FALLBACKS[ch];
    } else if (/\p{L}|\p{N}/u.test(ch)) {
      dropped += 1;
    }
  }
  const letters = [...text].filter((c) => /\p{L}|\p{N}/u.test(c)).length;
  if (letters > 0 && dropped / letters > 0.3) {
    throw new Error(
      `"${text}" uses characters the certificate font can't print yet (supported: Latin alphabets).`,
    );
  }
  return out.replace(/\s+/g, ' ').trim();
}

const FONT_MAP: Record<PdfFontFamily, StandardFonts> = {
  helvetica: StandardFonts.HelveticaBold,
  times: StandardFonts.TimesRomanBold,
  courier: StandardFonts.CourierBold,
};

/**
 * Generates a certificate PDF with the recipient name — and any extra text
 * overlays — drawn as vector text on top of the template image.
 */
export async function generateCertificatePdf(
  config: CertificateConfig,
): Promise<Uint8Array> {
  const {
    imageBuffer,
    name,
    x,
    y,
    fontSize,
    color,
    fontFamily = 'helvetica',
    extraFields = [],
  } = config;

  const pngBuffer = await normalizeToPng(imageBuffer);

  const metadata = await sharp(pngBuffer).metadata();
  const imgWidth = metadata.width ?? 1200;
  const imgHeight = metadata.height ?? 800;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([imgWidth, imgHeight]);

  const pngImage = await pdfDoc.embedPng(pngBuffer);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: imgWidth,
    height: imgHeight,
  });

  // Cache embedded fonts so we don't pay for a re-embed per extra field with
  // the same family. pdf-lib dedupes internally too, but keeping the font
  // handle avoids redundant async calls.
  const fontCache: Partial<Record<PdfFontFamily, PDFFont>> = {};
  async function getFont(family: PdfFontFamily): Promise<PDFFont> {
    const existing = fontCache[family];
    if (existing) return existing;
    const embedded = await pdfDoc.embedFont(FONT_MAP[family]);
    fontCache[family] = embedded;
    return embedded;
  }

  // Helper: draw one piece of text centered at (xPct, yPct). Y is flipped
  // because PDF origin is bottom-left while the UI uses top-down percentages.
  async function drawCenteredText(
    text: string,
    xPct: number,
    yPct: number,
    size: number,
    hex: string,
    family: PdfFontFamily,
  ) {
    if (!text) return;
    const font = await getFont(family);
    text = toPrintable(text, new Set(font.getCharacterSet()));
    // Font sizes are set against a CERT_WIDTH-wide certificate in the editor;
    // the actual image may be wider (html2canvas captures at 2x) or any size
    // (custom uploads), so scale to keep the PDF identical to the preview.
    size = size * (imgWidth / CERT_WIDTH);
    const width = font.widthOfTextAtSize(text, size);
    const height = font.heightAtSize(size);
    const pxX = (xPct / 100) * imgWidth - width / 2;
    const pxY = ((100 - yPct) / 100) * imgHeight - height / 2;
    const { r, g, b } = hexToRgb(hex);
    page.drawText(text, {
      x: pxX,
      y: pxY,
      size,
      font,
      color: rgb(r, g, b),
    });
  }

  // Recipient name.
  await drawCenteredText(name, x, y, fontSize, color, fontFamily);

  // Extra overlays.
  for (const field of extraFields) {
    await drawCenteredText(
      field.text,
      field.x,
      field.y,
      field.fontSize,
      field.color,
      field.fontFamily ?? 'helvetica',
    );
  }

  return await pdfDoc.save();
}
