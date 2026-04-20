import { NextRequest, NextResponse } from 'next/server';
import { generateCertificatePdf } from '@/lib/pdf';
import { PRESET_TEMPLATES } from '@/lib/templates';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Forzamos ejecución en runtime Node.js — pdf-lib y sharp no funcionan en edge
export const runtime = 'nodejs';

// Esta ruta recibe el template (data URL o id de preset) + configuración y devuelve un PDF.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      templateDataUrl, // Custom-uploaded template (data URL)
      templateId,      // Built-in preset id
      name,
      x,
      y,
      fontSize,
      color,
      fontFamily,
      extraFields,
    } = body as {
      templateDataUrl?: string;
      templateId?: string;
      name: string;
      x: number;
      y: number;
      fontSize: number;
      color: string;
      fontFamily?: 'helvetica' | 'times' | 'courier';
      extraFields?: Array<{
        text: string;
        x: number;
        y: number;
        fontSize: number;
        color: string;
        fontFamily?: 'helvetica' | 'times' | 'courier';
      }>;
    };

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'El campo "name" es obligatorio.' },
        { status: 400 },
      );
    }

    // Obtenemos el buffer de la imagen base según la fuente indicada
    let imageBuffer: Buffer;

    if (templateDataUrl) {
      // data:image/png;base64,....  →  extraemos la parte base64
      const match = templateDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json(
          { error: 'templateDataUrl no es un data URL válido.' },
          { status: 400 },
        );
      }
      imageBuffer = Buffer.from(match[2], 'base64');
    } else if (templateId) {
      const preset = PRESET_TEMPLATES.find((t) => t.id === templateId);
      if (!preset) {
        return NextResponse.json(
          { error: `Template preset "${templateId}" no encontrado.` },
          { status: 404 },
        );
      }
      // Leemos el archivo del filesystem público
      const filePath = path.join(process.cwd(), 'public', preset.path);
      imageBuffer = await readFile(filePath);
    } else {
      return NextResponse.json(
        { error: 'Debes proveer templateDataUrl o templateId.' },
        { status: 400 },
      );
    }

    const pdfBytes = await generateCertificatePdf({
      imageBuffer,
      name,
      x,
      y,
      fontSize,
      color,
      fontFamily,
      extraFields,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="certificado-${encodeURIComponent(name)}.pdf"`,
      },
    });
  } catch (err) {
    console.error('Error generando certificado:', err);
    return NextResponse.json(
      { error: 'No se pudo generar el certificado.' },
      { status: 500 },
    );
  }
}
