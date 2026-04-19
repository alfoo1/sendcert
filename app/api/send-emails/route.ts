import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { generateCertificatePdf } from '@/lib/pdf';
import { PRESET_TEMPLATES } from '@/lib/templates';
import {
  createTransporter,
  loadSmtpConfigFromEnv,
  renderTemplate,
  sendMail,
} from '@/lib/mail';
import { isValidEmail } from '@/lib/validation';
import { getClientIp, tryConsume } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 300;

type Recipient = { name: string; email: string };

type SendEmailsBody = {
  templateDataUrl?: string;
  templateId?: string;
  recipients: Recipient[];
  textConfig: {
    x: number;
    y: number;
    fontSize: number;
    color: string;
    fontFamily?: 'helvetica' | 'times' | 'courier';
  };
  emailConfig: {
    subject: string;
    body: string;
  };
};

type ResultEntry = {
  email: string;
  name: string;
  status: 'ok' | 'error';
  error?: string;
};

type ServerEvent =
  | { type: 'start'; total: number }
  | {
      type: 'progress';
      completed: number;
      total: number;
      result: ResultEntry;
    }
  | {
      type: 'done';
      sent: number;
      failed: number;
      usage: { used: number; limit: number; remaining: number };
    };

/**
 * Streams per-recipient progress via Server-Sent Events so the UI can show a
 * real progress bar + ETA. Rate limiting and template resolution happen before
 * the stream opens — failures there return plain JSON with the expected
 * status code (e.g. 429 so the existing waitlist modal keeps working).
 *
 * Event shape:
 *   data: { type: "start", total }
 *   data: { type: "progress", completed, total, result }
 *   data: { type: "done", sent, failed, usage }
 *
 * Each message is a single `data:` line followed by a blank line, per the SSE
 * spec. The client parses these with a tiny dispatcher in PreviewStep.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as SendEmailsBody;
  const { templateDataUrl, templateId, recipients, textConfig, emailConfig } = body;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'Recipient list is empty.' }, { status: 400 });
  }

  const validRecipients = recipients.filter(
    (r) => r?.name?.trim() && isValidEmail(r?.email ?? ''),
  );
  if (validRecipients.length === 0) {
    return NextResponse.json(
      { error: 'No valid recipients to send to.' },
      { status: 400 },
    );
  }

  // Reserve slots up-front — atomically, so two parallel requests from the
  // same IP can't both slip under the cap.
  const ip = getClientIp(req);
  const { allowed, status: rateStatus } = tryConsume(ip, validRecipients.length);
  if (!allowed) {
    return NextResponse.json(
      {
        error: "You've reached the 50-email free limit for this month.",
        limit: rateStatus.limit,
        used: rateStatus.used,
        remaining: rateStatus.remaining,
      },
      { status: 429 },
    );
  }

  // Resolve the template image before the stream starts so we can bail early.
  let baseImage: Buffer;
  try {
    if (templateDataUrl) {
      const match = templateDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json(
          { error: 'templateDataUrl is not a valid data URL.' },
          { status: 400 },
        );
      }
      baseImage = Buffer.from(match[2], 'base64');
    } else if (templateId) {
      const preset = PRESET_TEMPLATES.find((t) => t.id === templateId);
      if (!preset) {
        return NextResponse.json(
          { error: `Template preset "${templateId}" not found.` },
          { status: 404 },
        );
      }
      baseImage = await readFile(path.join(process.cwd(), 'public', preset.path));
    } else {
      return NextResponse.json(
        { error: 'You must provide either templateDataUrl or templateId.' },
        { status: 400 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Template load failed.' },
      { status: 500 },
    );
  }

  let smtpConfig;
  try {
    smtpConfig = loadSmtpConfigFromEnv();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'SMTP not configured.' },
      { status: 500 },
    );
  }
  const transporter = createTransporter(smtpConfig);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function sendEvent(event: ServerEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      sendEvent({ type: 'start', total: validRecipients.length });

      let sent = 0;
      let failed = 0;

      for (let i = 0; i < validRecipients.length; i++) {
        const recipient = validRecipients[i];
        const name = recipient.name.trim();
        const email = recipient.email.trim();
        let result: ResultEntry;

        try {
          const pdfBytes = await generateCertificatePdf({
            imageBuffer: baseImage,
            name,
            x: textConfig.x,
            y: textConfig.y,
            fontSize: textConfig.fontSize,
            color: textConfig.color,
            fontFamily: textConfig.fontFamily,
          });

          const subject = renderTemplate(emailConfig.subject, { name });
          const mailBody = renderTemplate(emailConfig.body, { name });

          await sendMail(transporter, smtpConfig, {
            to: email,
            subject,
            body: mailBody,
            attachments: [
              {
                filename: `certificate-${name.replace(/\s+/g, '-')}.pdf`,
                content: Buffer.from(pdfBytes),
                contentType: 'application/pdf',
              },
            ],
          });
          sent += 1;
          result = { email, name, status: 'ok' };
        } catch (err) {
          failed += 1;
          result = {
            email,
            name,
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }

        sendEvent({
          type: 'progress',
          completed: i + 1,
          total: validRecipients.length,
          result,
        });
      }

      sendEvent({
        type: 'done',
        sent,
        failed,
        usage: {
          used: rateStatus.used,
          limit: rateStatus.limit,
          remaining: rateStatus.remaining,
        },
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Suggest not to buffer if a proxy sits in front (e.g. Nginx).
      'X-Accel-Buffering': 'no',
    },
  });
}
