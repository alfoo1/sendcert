import { NextRequest, NextResponse } from 'next/server';
import { errorMessage, logEvent } from '@/lib/events';
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
import { isLocale, tx, type Locale } from '@/lib/i18n';
import { getClientIp } from '@/lib/rateLimit';
import { allowPublicHit, hitsSoFar } from '@/lib/publicRateLimit';
import { getLoggedInUserId } from '@/lib/session';
import { hashIp, logSend } from '@/lib/quota';
import {
  GUEST_DAILY_GLOBAL_LIMIT,
  guestCapMessage,
  guestEmailsLast24h,
  guestPausedMessage,
  guestSendingPaused,
  reportBlocked,
  screenSend,
} from '@/lib/abuseGuard';

export const runtime = 'nodejs';
// Single send — no need for a long timeout.
export const maxDuration = 60;

// Test emails per IP every 10 minutes.
const TEST_LIMIT = 6;

type ExtraFieldPayload = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily?: 'helvetica' | 'times' | 'courier';
};

type SendTestBody = {
  testName: string;
  testEmail: string;
  templateDataUrl?: string;
  templateId?: string;
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
    replyTo?: string;
    verification?: boolean;
  };
  extraFields?: ExtraFieldPayload[];
  locale?: string;
};

/**
 * Sends a single preview email to the user themselves so they can verify the
 * final result before blasting the full recipient list.
 *
 * Deliberately does NOT consume the monthly quota — users need to be able to
 * iterate on templates without burning through their free tier. It is
 * capped per IP instead (TEST_LIMIT per 10 minutes), goes through the same
 * abuse checks as real sends, and is recorded in send_log (kind 'test').
 *
 * The pipeline is otherwise identical to /api/send-emails: same PDF
 * generation, same SMTP sender, same `{{name}}` substitution. A test the user
 * receives reflects exactly what their recipients would get.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SendTestBody;
    const { testName, testEmail, templateDataUrl, templateId, textConfig, emailConfig, extraFields } = body;

    const locale: Locale = isLocale(body.locale) ? body.locale : 'en';
    const name = (testName ?? '').trim();
    const email = (testEmail ?? '').trim();

    if (!name) {
      return NextResponse.json(
        { error: tx(locale, { en: 'Test name is required.', es: 'Falta el nombre de prueba.' }) },
        { status: 400 },
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: tx(locale, { en: 'Please enter a valid test email address.', es: 'Ingresa un correo de prueba válido.' }) },
        { status: 400 },
      );
    }

    // ---------- Abuse checks ----------
    const userId = await getLoggedInUserId();
    const ipHash = hashIp(getClientIp(req));
    if (!userId && guestSendingPaused()) {
      return NextResponse.json({ error: guestPausedMessage(locale) }, { status: 403 });
    }
    if (!allowPublicHit(`send-test|${ipHash}`, TEST_LIMIT, 10 * 60_000)) {
      // Logged once per window, not on every rejected request.
      if (hitsSoFar(`send-test|${ipHash}`, 10 * 60_000) === TEST_LIMIT + 1) await reportBlocked({ route: '/api/send-test', code: 'rate_limit', match: `>${TEST_LIMIT} tests in 10 min`, userId, ipHash, subject: emailConfig?.subject });
      return NextResponse.json(
        {
          error: tx(locale, {
            en: 'Too many test emails. Wait a few minutes and try again.',
            es: 'Demasiados correos de prueba. Espera unos minutos y vuelve a intentarlo.',
          }),
        },
        { status: 429 },
      );
    }
    const blocked = await screenSend({
      route: '/api/send-test',
      userId,
      ipHash,
      locale,
      texts: [
        emailConfig?.subject,
        emailConfig?.body,
        ...(Array.isArray(extraFields) ? extraFields.map((f) => f?.text) : []),
      ],
      names: [name],
      recipients: 1,
      subject: emailConfig?.subject,
    });
    if (blocked) return NextResponse.json({ error: blocked, blocked: true }, { status: 400 });
    if (!userId && (await guestEmailsLast24h()) + 1 > GUEST_DAILY_GLOBAL_LIMIT) {
      await reportBlocked({ route: '/api/send-test', code: 'guest_cap', match: 'guest daily cap', userId, ipHash, subject: emailConfig?.subject });
      return NextResponse.json({ error: guestCapMessage(locale) }, { status: 429 });
    }

    // Load template (data URL override wins over preset id, matching the main
    // send route's behavior so both paths stay in sync).
    let baseImage: Buffer;
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

    let smtpConfig;
    try {
      smtpConfig = loadSmtpConfigFromEnv();
    } catch (err) {
      await logEvent('send.test_failed', { message: errorMessage(err), path: '/api/send-test', detail: { stage: 'smtp_config' } });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'SMTP not configured.' },
        { status: 500 },
      );
    }
    const transporter = createTransporter(smtpConfig);
  // Optional sender address for replies; ignored unless it's a valid email.
  const senderReplyTo = isValidEmail(emailConfig.replyTo ?? '')
    ? emailConfig.replyTo!.trim()
    : undefined;

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
      replyTo: senderReplyTo,
      subject,
      body: mailBody,
      attachments: [
        {
          filename: `certificate-${name.replace(/\s+/g, '-')}.pdf`,
          content: Buffer.from(pdfBytes),
          contentType: 'application/pdf',
        },
      ],
      previewVerification: emailConfig.verification !== false,
      locale,
    });

    await logSend({ userId, ipHash, template: 'test', recipients: 1, sent: 1, failed: 0, kind: 'test' });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error in /api/send-test:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logEvent('send.test_failed', { message, path: '/api/send-test' });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
