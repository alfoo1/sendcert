import { randomInt } from 'node:crypto';
import { getDefaultContent, type CertificateContent } from '@/lib/certificateContent';
import { defaultExtraFields, type ExtraField } from '@/lib/extraFields';
import { LOCALE_TAG, localizePath, type Locale } from '@/lib/i18n';
import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import { PRESET_TEMPLATES } from '@/lib/templates';
import { isValidEmail } from '@/lib/validation';

// Certificate drafts prepared by AI assistants through the MCP server
// (app/mcp/route.ts). A draft is everything the wizard needs to jump straight
// to review: design, texts, recipients and email. The user opens
// /app?draft=<id>, checks it and sends from the web — drafts never send.

export const DRAFT_TTL_HOURS = 24;
// Highest monthly allowance (a free account), so one draft can always fit.
export const MAX_DRAFT_RECIPIENTS = 300;

export type DraftRecipient = { name: string; email: string };

export type DraftEmail = {
  subject: string;
  body: string;
  replyTo?: string;
  certificateName: string;
  issuerName: string;
};

/** What the wizard loads (served by /api/drafts/[id]). */
export type AiDraft = {
  locale: Locale;
  templateId: string;
  content: CertificateContent;
  extraFields: ExtraField[];
  recipients: DraftRecipient[];
  emailConfig: DraftEmail;
  expiresAt: string;
};

/** Validated input of the create_certificate_draft tool. */
export type DraftInput = {
  locale: Locale;
  templateId: string;
  institutionName?: string;
  subtitle?: string;
  certificateTitle?: string;
  bodyText?: string;
  footerText?: string;
  signerName?: string;
  signerTitle?: string;
  date?: string;
  accentColor?: string;
  credentialName?: string;
  recipients: DraftRecipient[];
  emailSubject?: string;
  emailBody?: string;
  replyTo?: string;
};

export type SkippedRecipient = { name: string; email: string; reason: string };

// Lowercase, without look-alike characters. 31^12 ≈ 8 × 10^17 ids, so a
// draft link can't be guessed.
const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const ID_LENGTH = 12;

export function isDraftId(value: string): boolean {
  return new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`).test(value);
}

function newDraftId(): string {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) id += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  return id;
}

const PLACEHOLDER_INSTITUTIONS = ['Example Academy', 'Academia Ejemplo'];

function defaultEmail(locale: Locale): { subject: string; body: string } {
  return locale === 'es'
    ? {
        subject: 'Tu certificado',
        body: 'Hola {{name}},\n\n¡Felicitaciones! Te adjuntamos tu certificado.\n\nSaludos,',
      }
    : {
        subject: 'Your certificate',
        body: 'Hi {{name}},\n\nCongratulations! Your certificate is attached to this email.\n\nBest regards,',
      };
}

/** "Certificate of" + "Achievement" → "Certificate of Achievement" (same rule as the wizard). */
function credentialNameFrom(c: CertificateContent): string {
  const title = c.certificateTitle.trim();
  const subtitle = c.subtitleLabel.trim();
  if (/^(of|de)\b/i.test(title) || /\b(of|de)$/i.test(subtitle)) return `${subtitle} ${title}`.trim();
  return title;
}

/**
 * Cleans the recipient list: trims, drops entries without a name or with an
 * invalid email, and removes duplicate emails. Returns what was skipped so the
 * assistant can tell the user.
 */
export function cleanRecipients(list: DraftRecipient[]): {
  recipients: DraftRecipient[];
  skipped: SkippedRecipient[];
} {
  const recipients: DraftRecipient[] = [];
  const skipped: SkippedRecipient[] = [];
  const seen = new Set<string>();
  for (const entry of list) {
    const name = entry.name.trim().replace(/\s+/g, ' ');
    const email = entry.email.trim();
    if (!name) skipped.push({ name, email, reason: 'missing name' });
    else if (!isValidEmail(email)) skipped.push({ name, email, reason: 'invalid email' });
    else if (seen.has(email.toLowerCase())) skipped.push({ name, email, reason: 'duplicate email' });
    else {
      seen.add(email.toLowerCase());
      recipients.push({ name, email });
    }
  }
  return { recipients, skipped };
}

/** Builds the wizard state from the tool input (template defaults + overrides). */
export function buildDraft(input: DraftInput, recipients: DraftRecipient[], expiresAt: Date): AiDraft {
  const { locale } = input;
  const base = getDefaultContent(input.templateId, locale);
  const titleGiven = input.certificateTitle !== undefined;
  const content: CertificateContent = {
    ...base,
    institutionName: input.institutionName ?? base.institutionName,
    // A full title ("Certificate of Attendance") replaces both template lines,
    // otherwise the default "Certificate of" would be printed above it.
    subtitleLabel: input.subtitle ?? (titleGiven ? '' : base.subtitleLabel),
    certificateTitle: input.certificateTitle ?? base.certificateTitle,
    bodyText: input.bodyText ?? base.bodyText,
    footerText: input.footerText ?? base.footerText,
    signerName: input.signerTitle ?? base.signerName,
    accentColor: input.accentColor ?? base.accentColor,
    logoDataUrl: null,
  };

  // Default overlays: [0] text above the left (signature) line, [1] the date.
  const extraFields = defaultExtraFields(locale);
  if (input.signerName !== undefined) extraFields[0].value = input.signerName;
  extraFields[1].value =
    input.date ??
    new Date().toLocaleDateString(LOCALE_TAG[locale], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

  const email = defaultEmail(locale);
  const issuer = PLACEHOLDER_INSTITUTIONS.includes(content.institutionName) ? '' : content.institutionName;
  return {
    locale,
    templateId: input.templateId,
    content,
    extraFields,
    recipients,
    emailConfig: {
      subject: input.emailSubject ?? email.subject,
      body: input.emailBody ?? email.body,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      certificateName: input.credentialName ?? credentialNameFrom(content),
      issuerName: issuer,
    },
    expiresAt: expiresAt.toISOString(),
  };
}

// Local development without Supabase keeps drafts in memory, so the whole
// flow can be tried with `next dev`. Production always uses the database.
// Kept on globalThis because each dev route bundle gets its own module copy.
const memoryDrafts: Map<string, AiDraft> = ((globalThis as { __sendcertDrafts?: Map<string, AiDraft> })
  .__sendcertDrafts ??= new Map());
const useMemory = () => !isSupabaseServiceConfigured() && process.env.NODE_ENV !== 'production';

export class DraftStoreUnavailableError extends Error {}

export async function saveDraft(draft: AiDraft, client?: string): Promise<string> {
  const id = newDraftId();
  if (useMemory()) {
    memoryDrafts.set(id, draft);
    return id;
  }
  if (!isSupabaseServiceConfigured()) throw new DraftStoreUnavailableError('Draft storage is not configured');
  const { error } = await createServiceSupabaseClient()
    .from('ai_drafts')
    .insert({
      id,
      expires_at: draft.expiresAt,
      locale: draft.locale,
      client: client?.slice(0, 200) ?? null,
      recipients: draft.recipients.length,
      payload: draft,
    });
  if (error) throw new DraftStoreUnavailableError(error.message);
  return id;
}

/** Returns the draft if it exists and hasn't expired. */
export async function getDraft(id: string): Promise<AiDraft | null> {
  if (!isDraftId(id)) return null;
  let draft: AiDraft | null = null;
  if (useMemory()) {
    draft = memoryDrafts.get(id) ?? null;
  } else if (isSupabaseServiceConfigured()) {
    const { data } = await createServiceSupabaseClient()
      .from('ai_drafts')
      .select('payload')
      .eq('id', id)
      .maybeSingle();
    draft = (data?.payload as AiDraft | undefined) ?? null;
  }
  if (!draft || new Date(draft.expiresAt).getTime() < Date.now()) return null;
  return draft;
}

/** Deletes expired drafts (called by the daily cron). */
export async function deleteExpiredDrafts(): Promise<void> {
  if (!isSupabaseServiceConfigured()) return;
  const { error } = await createServiceSupabaseClient()
    .from('ai_drafts')
    .delete()
    .lt('expires_at', new Date().toISOString());
  if (error) console.error('Failed to delete expired drafts:', error);
}

export function draftReviewUrl(siteUrl: string, id: string, locale: Locale): string {
  return `${siteUrl}${localizePath('/app', locale)}?draft=${id}`;
}

export function isPresetTemplate(id: string): boolean {
  return PRESET_TEMPLATES.some((t) => t.id === id);
}
