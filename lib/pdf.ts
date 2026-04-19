import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';

// Configuración para generar un certificado en PDF a partir de una imagen base.
export type CertificateConfig = {
  // Imagen base: Buffer con el template (JPG/PNG o SVG rasterizado)
  imageBuffer: Buffer;
  // Nombre del alumno a imprimir
  name: string;
  // Coordenadas en porcentaje (0-100) relativas al ancho/alto del template
  x: number;
  y: number;
  // Tamaño de fuente en puntos PDF
  fontSize: number;
  // Color en formato hex (#RRGGBB)
  color: string;
  // Familia de fuente: 'helvetica' | 'times' | 'courier'
  fontFamily?: 'helvetica' | 'times' | 'courier';
};

/**
 * Convierte un color hex (#RRGGBB) a valores RGB normalizados 0-1 que usa pdf-lib.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Normaliza la imagen de entrada a PNG usando sharp.
 * Esto permite aceptar SVG/JPG/PNG indistintamente — pdf-lib solo embebe JPG/PNG nativos.
 */
async function normalizeToPng(input: Buffer): Promise<Buffer> {
  return sharp(input).png().toBuffer();
}

/**
 * Genera un certificado en PDF con el nombre impreso sobre el template.
 * Devuelve un Uint8Array listo para guardar o servir como respuesta HTTP.
 */
export async function generateCertificatePdf(config: CertificateConfig): Promise<Uint8Array> {
  const {
    imageBuffer,
    name,
    x,
    y,
    fontSize,
    color,
    fontFamily = 'helvetica',
  } = config;

  // Normalizamos la imagen a PNG para embeberla en el PDF
  const pngBuffer = await normalizeToPng(imageBuffer);

  // Obtenemos las dimensiones reales de la imagen
  const metadata = await sharp(pngBuffer).metadata();
  const imgWidth = metadata.width ?? 1200;
  const imgHeight = metadata.height ?? 800;

  // Creamos el documento PDF con el tamaño exacto de la imagen
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([imgWidth, imgHeight]);

  // Embebemos la imagen y la dibujamos a tamaño completo
  const pngImage = await pdfDoc.embedPng(pngBuffer);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: imgWidth,
    height: imgHeight,
  });

  // Seleccionamos la fuente estándar — usamos bold para un certificado más formal
  const fontMap = {
    helvetica: StandardFonts.HelveticaBold,
    times: StandardFonts.TimesRomanBold,
    courier: StandardFonts.CourierBold,
  };
  const font = await pdfDoc.embedFont(fontMap[fontFamily]);

  // Medimos el ancho del texto para centrarlo en las coordenadas dadas
  const textWidth = font.widthOfTextAtSize(name, fontSize);
  const textHeight = font.heightAtSize(fontSize);

  // Las coordenadas vienen en porcentaje. En PDF el origen Y está abajo-izquierda,
  // por lo que invertimos el eje Y (100 - y) para coincidir con la intuición de la UI.
  const pxX = (x / 100) * imgWidth - textWidth / 2;
  const pxY = ((100 - y) / 100) * imgHeight - textHeight / 2;

  const { r, g, b } = hexToRgb(color);

  page.drawText(name, {
    x: pxX,
    y: pxY,
    size: fontSize,
    font,
    color: rgb(r, g, b),
  });

  return await pdfDoc.save();
}
