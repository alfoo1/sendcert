import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cookies } from 'next/headers';
import { generateCertificatePdf } from '@/lib/pdf';
import { generateCertificateImagePng } from '@/lib/certificateImage';
import { PRESET_TEMPLATES } from '@/lib/templates';
import {
  createTransporter,
  loadSmtpConfigFromEnv,
  renderTemplate,
  sendMail,
} from '@/lib/mail';
import { isValidEmail } from '@/lib/validation';
import { getClientIp, tryConsume } from '@/lib/rateLimit';
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
  isSupabaseConfigured,
  isSupabaseServiceConfigured,
} from '@/lib/supabase';
import { generateVerifyId } from '@/lib/verifyId';

export const runtime = 'nodejs';
export const maxDuration = 300;

type Recipient = { name: string; email: string };

type ExtraFieldPayload = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily?: 'helvetica' | 'times' | 'courier';
};

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
  extraFields?: ExtraFieldPayload[];
  // Optional override for the certificate's stored "course name" — falls
  // back to the email subject (with `{{name}}` stripped) when missing.
  courseName?: string;
};

type ResultEntry = {
  email: string;
  name: string;
  status: 'ok' | 'error';
  error?: string;
  // Present only when the cert was successfully saved to Supabase.
  verifyId?: string;
};

type ServerEvent =
  | { type: 'start'; total: number; loggedIn: boolean }
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

const GUEST_LIMIT = Number(process.env.RATE_LIMIT_GUEST_PER_MONTH ?? 30);
const USER_LIMIT = Number(process.env.RATE_LIMIT_PER_MONTH ?? 150);
// Certificates persist for two years by default — tunable via env.
const CERTIFICATE_VALID_YEARS = Number(process.env.CERTIFICATE_VALID_YEARS ?? 2);

/**
 * Resolves the current user's id from the Supabase session cookie. Returns
 * null when Supabase isn't configured or the request is from a guest.
 */
async function getLoggedInUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const cookieStore = cookies();
    const supabase = createServerSupabaseClient({
      getAll: () => cookieStore.getAll(),
      // Read-only path: we don't mutate cookies during a send.
      setAll: () => {},
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Reserves N slots for a logged-in user. Returns false if the reservation
 * would exceed the monthly cap. Atomicity is best-effort (re-read + write);
 * acceptable for low-volume MVP, replace with a DB-side increment for scale.
 */
async function reserveUserSends(
  userId: string,
  amount: number,
): Promise<{ allowed: boolean; used: number; limit: number; remaining: number }> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('sends_this_month')
    .eq('id', userId)
    .single();
  if (error || !data) {
    return { allowed: false, used: 0, limit: USER_LIMIT, remaining: 0 };
  }
  const current = data.sends_this_month ?? 0;
  const next = current + amount;
  if (next > USER_LIMIT) {
    return {
      allowed: false,
      used: current,
      limit: USER_LIMIT,
      remaining: Math.max(0, USER_LIMIT - current),
    };
  }
  const { error: updateError } = await supabase
    .from('users')
    .update({ sends_this_month: next })
    .eq('id', userId);
  if (updateError) {
    return { allowed: false, used: current, limit: USER_LIMIT, remaining: USER_LIMIT - current };
  }
  return {
    allowed: true,
    used: next,
    limit: USER_LIMIT,
    remaining: USER_LIMIT - next,
  };
}

/**
 * Streams per-recipient progress via Server-Sent Events so the UI can show a
 * real progress bar + ETA. Rate limiting and template resolution happen
 * before the stream opens — failures there return plain JSON with the right
 * status code (429 so the existing waitlist modal keeps working).
 *
 * Logged-in users:
 *   - Counted against the user-tier monthly cap (USER_LIMIT, default 150).
 *   - Each successful send is persisted to certificates_issued with a
 *     unique verify_id; the same id is streamed back to the client so the
 *     success screen can show /verify/<id> URLs.
 *
 * Guests (no session cookie):
 *   - Counted against the guest IP cap (GUEST_LIMIT, default 30).
 *   - Nothing is persisted — the post-send banner suggests creating an
 *     account to get verify URLs.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as SendEmailsBody;
  const {
    templateDataUrl,
    templateId,
    recipients,
    textConfig,
    emailConfig,
    extraFields,
    courseName,
  } = body;

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

  // ---------- Auth-aware rate limit ----------
  const userId = await getLoggedInUserId();
  let rateStatus: { used: number; limit: number; remaining: number };
  if (userId && isSupabaseServiceConfigured()) {
    const reservation = await reserveUserSends(userId, validRecipients.length);
    if (!reservation.allowed) {
      return NextResponse.json(
        {
          error: `You've reached the ${USER_LIMIT}-email limit for this month.`,
          used: reservation.used,
          limit: reservation.limit,
          remaining: reservation.remaining,
        },
        { status: 429 },
      );
    }
    rateStatus = {
      used: reservation.used,
      limit: reservation.limit,
      remaining: reservation.remaining,
    };
  } else {
    // Guest path — same in-memory IP limiter as before, with a stricter cap.
    const ip = getClientIp(req);
    const { allowed, status } = tryConsume(ip, validRecipients.length, GUEST_LIMIT);
    if (!allowed) {
      return NextResponse.json(
        {
          error: `You've reached the ${GUEST_LIMIT}-email free guest limit for this month.`,
          limit: status.limit,
          used: status.used,
          remaining: status.remaining,
        },
        { status: 429 },
      );
    }
    rateStatus = status;
  }

  // ---------- Template image ----------
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

  // Strip {{name}} from the subject so the stored course_name doesn't carry
  // the placeholder. If the caller supplied a courseName we always prefer it.
  const inferredCourseName =
    (courseName?.trim() || emailConfig.subject?.replace(/\{\{\s*name\s*\}\}/g, '').trim()) ||
    null;

  // Pre-build today / expiry dates once so all rows in this batch agree.
  const issuedDate = new Date();
  const expiryDate = new Date(issuedDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + CERTIFICATE_VALID_YEARS);
  const issuedDateIso = issuedDate.toISOString().slice(0, 10);
  const expiryDateIso = expiryDate.toISOString().slice(0, 10);

  // Lazy-init service client only when we'll actually use it.
  const supabaseService =
    userId && isSupabaseServiceConfigured()
      ? createServiceSupabaseClient()
      : null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function sendEvent(event: ServerEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      sendEvent({
        type: 'start',
        total: validRecipients.length,
        loggedIn: Boolean(userId),
      });

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
            extraFields,
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

          // Persist to Supabase only for logged-in users. Failures here are
          // non-fatal — the email already shipped, we don't want to bubble
          // a DB error back as a per-recipient failure. Worst case the user
          // doesn't get a verify URL for this row.
          let verifyId: string | undefined;
          if (supabaseService && userId) {
            try {
              const candidateId = generateVerifyId(issuedDate);
              const imagePng = await generateCertificateImagePng({
                imageBuffer: baseImage,
                name,
                x: textConfig.x,
                y: textConfig.y,
                fontSize: textConfig.fontSize,
                color: textConfig.color,
                fontFamily: textConfig.fontFamily,
                extraFields,
              });
              const imageDataUrl = `data:image/png;base64,${imagePng.toString('base64')}`;

              const { error: insertError } = await supabaseService
                .from('certificates_issued')
                .insert({
                  verify_id: candidateId,
                  user_id: userId,
                  recipient_name: name,
                  recipient_email: email,
                  course_name: inferredCourseName,
                  issuer_name: smtpConfig.fromName ?? 'SendCert',
                  issued_date: issuedDateIso,
                  expiry_date: expiryDateIso,
                  certificate_image_url: imageDataUrl,
                });
              if (!insertError) {
                verifyId = candidateId;
              } else {
                console.error('certificates_issued insert failed:', insertError);
              }
            } catch (dbErr) {
              console.error('Persist verify record failed:', dbErr);
            }
          }

          result = { email, name, status: 'ok', verifyId };
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
        usage: rateStatus,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
