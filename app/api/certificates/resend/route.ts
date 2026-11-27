import { NextResponse, type NextRequest } from 'next/server';
import { generateCertificatePdf } from '@/lib/pdf';
import {
  createTransporter,
  linkedInRedirectFor,
  loadSmtpConfigFromEnv,
  renderTemplate,
  sendMail,
  verifyUrlFor,
} from '@/lib/mail';
import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import { getLoggedInUser } from '@/lib/session';
import { consumeUserQuota, logSend, USER_LIMIT } from '@/lib/quota';
import { errorMessage, logEvent } from '@/lib/events';
import { isValidEmail } from '@/lib/validation';
import { isLocale, tx, type Locale } from '@/lib/i18n';
import type { TextOverlay } from '@/lib/certificates';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Body = { verifyId?: unknown; name?: unknown; email?: unknown };

function defaultEmail(locale: Locale) {
  return locale === 'es'
    ? { subject: 'Tu certificado', body: 'Hola {{name}},\n\nTe reenviamos tu certificado.\n\nSaludos,' }
    : { subject: 'Your certificate', body: 'Hi {{name}},\n\nHere is your certificate again.\n\nBest regards,' };
}

/**
 * Resends one certificate from the sender's dashboard, optionally fixing the
 * recipient's name or email first. The verification ID stays the same, so
 * links already shared keep working. Counts as one certificate of the
 * monthly allowance.
 */
export async function POST(req: NextRequest) {
  const user = await getLoggedInUser();
  if (!user) return NextResponse.json({ error: 'Sign in to resend certificates.' }, { status: 401 });
  if (!isSupabaseServiceConfigured()) return NextResponse.json({ error: 'Not available.' }, { status: 503 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const verifyId = typeof body.verifyId === 'string' ? body.verifyId : '';
  const supabase = createServiceSupabaseClient();
  const { data: cert } = await supabase
    .from('certificates_issued')
    .select(
      'verify_id, recipient_name, recipient_email, batch_id, certificate_batches(locale, template_image, text_config, extra_fields, email_subject, email_body, reply_to)',
    )
    .eq('verify_id', verifyId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!cert || !cert.certificate_batches) {
    return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 });
  }
  const batch = cert.certificate_batches as unknown as {
    locale: string;
    template_image: string;
    text_config: TextOverlay;
    extra_fields: (TextOverlay & { text: string })[];
    email_subject: string | null;
    email_body: string | null;
    reply_to: string | null;
  };
  const locale: Locale = isLocale(batch.locale) ? batch.locale : 'en';
  const t = (en: string, es: string) => tx(locale, { en, es });

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().replace(/\s+/g, ' ') : (cert.recipient_name as string);
  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : ((cert.recipient_email as string | null) ?? '');
  if (name.length > 120) return NextResponse.json({ error: t('The name is too long.', 'El nombre es demasiado largo.') }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: t('Enter a valid email address.', 'Escribe un correo válido.') }, { status: 400 });

  const quota = await consumeUserQuota(user.id, 1);
  if (!quota.allowed) {
    await logEvent('send.limit_reached', { level: 'warn', message: 'Resend blocked by monthly limit', path: '/api/certificates/resend', userId: user.id });
    return NextResponse.json(
      { error: t(`You've reached the ${USER_LIMIT}-certificate limit for this month.`, `Llegaste al límite de ${USER_LIMIT} certificados de este mes.`) },
      { status: 429 },
    );
  }

  try {
    const imageBuffer = Buffer.from(batch.template_image.split(',')[1] ?? '', 'base64');
    const pdfBytes = await generateCertificatePdf({
      imageBuffer,
      name,
      x: batch.text_config.x,
      y: batch.text_config.y,
      fontSize: batch.text_config.fontSize,
      color: batch.text_config.color,
      fontFamily: batch.text_config.fontFamily,
      extraFields: batch.extra_fields ?? [],
    });

    // Fix the record first so the verification page shows the new name.
    if (name !== cert.recipient_name || email !== cert.recipient_email) {
      const { error } = await supabase
        .from('certificates_issued')
        .update({ recipient_name: name, recipient_email: email })
        .eq('verify_id', verifyId)
        .eq('user_id', user.id);
      if (error) throw new Error(`Could not update the certificate: ${error.message}`);
    }

    const smtp = loadSmtpConfigFromEnv();
    const fallback = defaultEmail(locale);
    await sendMail(createTransporter(smtp), smtp, {
      to: email,
      replyTo: batch.reply_to ?? undefined,
      subject: renderTemplate(batch.email_subject ?? fallback.subject, { name }),
      body: renderTemplate(batch.email_body ?? fallback.body, { name }),
      attachments: [
        {
          filename: `certificate-${name.replace(/\s+/g, '-')}.pdf`,
          content: Buffer.from(pdfBytes),
          contentType: 'application/pdf',
        },
      ],
      verifyUrl: verifyUrlFor(verifyId),
      linkedInUrl: linkedInRedirectFor(verifyId, 'add', 'email'),
      verifyId,
      locale,
    });
    await logSend({ userId: user.id, ipHash: '', template: 'resend', recipients: 1, sent: 1, failed: 0, batchId: cert.batch_id as string });
    return NextResponse.json({ ok: true, name, email });
  } catch (err) {
    await consumeUserQuota(user.id, -1);
    await logEvent('send.resend_failed', { message: errorMessage(err), path: '/api/certificates/resend', userId: user.id });
    return NextResponse.json(
      { error: t('Could not resend the certificate. Please try again.', 'No pudimos reenviar el certificado. Inténtalo de nuevo.') },
      { status: 500 },
    );
  }
}
