import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  DRAFT_TTL_HOURS,
  MAX_DRAFT_RECIPIENTS,
  DraftStoreUnavailableError,
  buildDraft,
  cleanRecipients,
  draftReviewUrl,
  isPresetTemplate,
  saveDraft,
  type DraftInput,
  type DraftRecipient,
} from '@/lib/aiDrafts';
import { getDefaultContent } from '@/lib/certificateContent';
import { certificateTitle, getCertificate, isExpired } from '@/lib/certificates';
import { isLocale, type Locale } from '@/lib/i18n';
import { PRESET_TEMPLATES, presetDescription, presetName } from '@/lib/templates';
import { isValidEmail } from '@/lib/validation';

// SendCert's MCP server: lets AI assistants (Claude, ChatGPT, Gemini and any
// other MCP client) prepare certificates. Deliberately authless and unable to
// send: create_certificate_draft returns a link where the user reviews the
// certificates and clicks Send on sendcert.org, inside the normal free limits.
//
// Input schemas are plain JSON Schema (no $ref, anyOf or additionalProperties)
// because some clients, Gemini in particular, only accept a subset.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sendcert.org').replace(/\/$/, '');

const TEMPLATE_IDS = PRESET_TEMPLATES.map((t) => t.id);

const INSTRUCTIONS = `SendCert creates personalized PDF certificates and emails one to each recipient. Every certificate gets a public verification page and an "Add to LinkedIn" button.

Typical request: "Send certificates to the people in this spreadsheet." Gather from the user what the certificate is for (course, workshop or event), the issuing organization, who signs it, the date and the recipient list (name and email). Ask only for what is missing.

create_certificate_draft never sends email. It returns a review link: the user opens it, checks the design, recipients and message, and clicks Send on sendcert.org. Always give the user that link and say nothing has been sent yet.

Free plan: 100 certificates a month without an account, 300 with a free account. Recipient names must use the Latin alphabet. Write every certificate and email text in the user's language (English "en" or Spanish "es").`;

const TOOLS: Tool[] = [
  {
    name: 'list_certificate_templates',
    title: 'List certificate templates',
    description:
      'Lists the built-in SendCert certificate designs with their id, name, description, accent color and default texts. Use it to suggest a design or to see which texts a template shows.',
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          enum: ['en', 'es'],
          description: 'Language for names and default texts. Defaults to "en".',
        },
      },
    },
    annotations: {
      title: 'List certificate templates',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'create_certificate_draft',
    title: 'Create certificate draft',
    description: `Prepares a batch of personalized certificates (one per recipient) plus the email that delivers them, and returns a review link on sendcert.org. Nothing is sent: the user opens the link, reviews everything and clicks Send. The link expires after ${DRAFT_TTL_HOURS} hours. Any text left out uses the template default. Up to ${MAX_DRAFT_RECIPIENTS} recipients per draft; entries without a name, with an invalid email or with a repeated email are skipped and reported.`,
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          enum: ['en', 'es'],
          description: 'Language of the certificate, the email and the review page. Match the user.',
        },
        recipients: {
          type: 'array',
          minItems: 1,
          maxItems: MAX_DRAFT_RECIPIENTS,
          description: 'People who receive a certificate. Each one gets their own PDF with their name.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', maxLength: 120, description: 'Full name as printed on the certificate.' },
              email: { type: 'string', maxLength: 254, description: 'Email address the certificate is sent to.' },
            },
            required: ['name', 'email'],
          },
        },
        template_id: {
          type: 'string',
          enum: TEMPLATE_IDS,
          description:
            'Design: elegant (navy and gold, formal), minimal (clean, any use), bold (tech courses, webinars), academic (schools), corporate (staff training), friendly (workshops, kids). Defaults to "elegant".',
        },
        institution_name: {
          type: 'string',
          maxLength: 120,
          description: 'Organization issuing the certificate, shown at the top.',
        },
        certificate_title: {
          type: 'string',
          maxLength: 120,
          description: 'Main title, e.g. "Certificate of Attendance" or "Certificado de participación".',
        },
        subtitle: {
          type: 'string',
          maxLength: 80,
          description:
            'Optional small line above the title. When certificate_title is given and this is left out, no subtitle is shown.',
        },
        body_text: {
          type: 'string',
          maxLength: 200,
          description: 'Line printed just before the recipient name, e.g. "This certifies that".',
        },
        footer_text: {
          type: 'string',
          maxLength: 300,
          description:
            'Line printed after the recipient name; usually names the course or event, e.g. "attended the Excel for Beginners workshop (8 hours)."',
        },
        signer_name: {
          type: 'string',
          maxLength: 80,
          description: 'Name printed above the signature line, e.g. "Dr. Ana Pérez".',
        },
        signer_title: {
          type: 'string',
          maxLength: 80,
          description: 'Caption under the signature line, e.g. "Program Director".',
        },
        date: {
          type: 'string',
          maxLength: 60,
          description: 'Date printed on the certificate, written out, e.g. "November 20, 2026". Defaults to today.',
        },
        accent_color: {
          type: 'string',
          description: 'Accent color as #RRGGBB. Defaults to the template color.',
        },
        credential_name: {
          type: 'string',
          maxLength: 120,
          description:
            'Name of the credential on each verification page and on LinkedIn, e.g. "Excel for Beginners Workshop". Defaults to the certificate title.',
        },
        email_subject: {
          type: 'string',
          maxLength: 200,
          description: 'Email subject. {{name}} is replaced by each recipient name.',
        },
        email_body: {
          type: 'string',
          maxLength: 5000,
          description:
            'Plain-text email body. {{name}} is replaced by each recipient name. The PDF is attached automatically.',
        },
        reply_to: {
          type: 'string',
          maxLength: 254,
          description: "The sender's email address, so recipients' replies reach them.",
        },
      },
      required: ['language', 'recipients'],
    },
    annotations: {
      title: 'Create certificate draft',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: 'verify_certificate',
    title: 'Verify a certificate',
    description:
      'Checks whether a certificate issued with SendCert is genuine, from its verification ID (e.g. CERT-2026-AB3K-9XQ2) or its sendcert.org/verify link. Returns who it was issued to, the credential, the issuer and the dates.',
    inputSchema: {
      type: 'object',
      properties: {
        certificate_id: {
          type: 'string',
          maxLength: 200,
          description: 'Verification ID printed on the certificate, or its verification URL.',
        },
      },
      required: ['certificate_id'],
    },
    annotations: {
      title: 'Verify a certificate',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

// ---------- Input helpers ----------

class InputError extends Error {}

type Args = Record<string, unknown>;

function optionalString(args: Args, key: string, max: number): string | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new InputError(`"${key}" must be a string.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new InputError(`"${key}" must be at most ${max} characters.`);
  return trimmed;
}

function readLocale(args: Args): Locale {
  const value = args.language ?? 'en';
  if (!isLocale(value)) throw new InputError('"language" must be "en" or "es".');
  return value;
}

function readRecipients(args: Args): DraftRecipient[] {
  const value = args.recipients;
  if (!Array.isArray(value) || value.length === 0) {
    throw new InputError('"recipients" must be a non-empty list of { name, email }.');
  }
  if (value.length > MAX_DRAFT_RECIPIENTS) {
    throw new InputError(
      `A draft holds up to ${MAX_DRAFT_RECIPIENTS} recipients (got ${value.length}). Split the list into several drafts.`,
    );
  }
  return value.map((entry, i) => {
    if (!entry || typeof entry !== 'object') throw new InputError(`recipients[${i}] must be an object.`);
    const { name, email } = entry as Args;
    return {
      name: typeof name === 'string' ? name.slice(0, 120) : '',
      email: typeof email === 'string' ? email.slice(0, 254) : '',
    };
  });
}

function json(result: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  };
}

function toolError(message: string): CallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

// ---------- Tools ----------

function listTemplates(args: Args): CallToolResult {
  const locale = readLocale(args);
  return json({
    templates: PRESET_TEMPLATES.map((t) => {
      const c = getDefaultContent(t.id, locale);
      return {
        id: t.id,
        name: presetName(t.id, locale),
        description: presetDescription(t.id, locale),
        accent_color: c.accentColor,
        default_texts: {
          subtitle: c.subtitleLabel,
          certificate_title: c.certificateTitle,
          body_text: c.bodyText,
          footer_text: c.footerText,
          signer_title: c.signerName,
        },
      };
    }),
  });
}

async function createDraft(args: Args, client?: string): Promise<CallToolResult> {
  const locale = readLocale(args);
  const templateId = optionalString(args, 'template_id', 40) ?? 'elegant';
  if (!isPresetTemplate(templateId)) {
    throw new InputError(`"template_id" must be one of: ${TEMPLATE_IDS.join(', ')}.`);
  }
  const accentColor = optionalString(args, 'accent_color', 7);
  if (accentColor && !/^#[0-9a-f]{6}$/i.test(accentColor)) {
    throw new InputError('"accent_color" must look like #1E3A5F.');
  }
  const replyTo = optionalString(args, 'reply_to', 254);
  if (replyTo && !isValidEmail(replyTo)) throw new InputError('"reply_to" must be a valid email address.');

  const input: DraftInput = {
    locale,
    templateId,
    institutionName: optionalString(args, 'institution_name', 120),
    subtitle: optionalString(args, 'subtitle', 80),
    certificateTitle: optionalString(args, 'certificate_title', 120),
    bodyText: optionalString(args, 'body_text', 200),
    footerText: optionalString(args, 'footer_text', 300),
    signerName: optionalString(args, 'signer_name', 80),
    signerTitle: optionalString(args, 'signer_title', 80),
    date: optionalString(args, 'date', 60),
    accentColor,
    credentialName: optionalString(args, 'credential_name', 120),
    recipients: readRecipients(args),
    emailSubject: optionalString(args, 'email_subject', 200),
    emailBody: optionalString(args, 'email_body', 5000),
    replyTo,
  };

  const { recipients, skipped } = cleanRecipients(input.recipients);
  if (recipients.length === 0) {
    return toolError(
      `No valid recipients: every entry was skipped (${skipped
        .slice(0, 5)
        .map((s) => `${s.name || '(no name)'} <${s.email || 'no email'}>: ${s.reason}`)
        .join('; ')}). Each recipient needs a name and a valid email address.`,
    );
  }

  const expiresAt = new Date(Date.now() + DRAFT_TTL_HOURS * 60 * 60 * 1000);
  const draft = buildDraft(input, recipients, expiresAt);
  let id: string;
  try {
    id = await saveDraft(draft, client);
  } catch (err) {
    console.error('MCP create_certificate_draft failed to save:', err);
    if (err instanceof DraftStoreUnavailableError) {
      return toolError('SendCert could not save the draft right now. Please try again in a minute.');
    }
    throw err;
  }

  const reviewUrl = draftReviewUrl(SITE_URL, id, locale);
  return json({
    review_url: reviewUrl,
    expires_at: draft.expiresAt,
    status: 'draft_created_nothing_sent',
    language: locale,
    template: { id: templateId, name: presetName(templateId, locale) },
    certificate: {
      institution_name: draft.content.institutionName,
      title: [draft.content.subtitleLabel, draft.content.certificateTitle].filter(Boolean).join(' '),
      footer_text: draft.content.footerText,
      signer: draft.extraFields[0].value,
      date: draft.extraFields[1].value,
      credential_name: draft.emailConfig.certificateName,
    },
    email: { subject: draft.emailConfig.subject },
    recipients_count: recipients.length,
    skipped_recipients: skipped.slice(0, 20),
    skipped_count: skipped.length,
    limits:
      recipients.length > 100
        ? 'More than 100 recipients: the user must sign in (free account, 300 certificates a month) before sending.'
        : 'Fits the free limit without an account (100 certificates a month).',
    next_step:
      'Share review_url with the user. They open it, check the certificate, recipients and email, and click Send on sendcert.org.',
  });
}

const VERIFY_ID_PATTERN = /CERT-\d{4}-[A-Z0-9]{4}(?:-[A-Z0-9]{4})?/i;

async function verifyCertificate(args: Args): Promise<CallToolResult> {
  const raw = optionalString(args, 'certificate_id', 200);
  if (!raw) throw new InputError('"certificate_id" is required.');
  const id = raw.match(VERIFY_ID_PATTERN)?.[0]?.toUpperCase();
  if (!id) {
    return json({
      found: false,
      status: 'invalid_id',
      message: 'SendCert verification IDs look like CERT-2026-AB3K-9XQ2.',
    });
  }
  const cert = await getCertificate(id);
  if (!cert) {
    return json({
      found: false,
      status: 'not_found',
      certificate_id: id,
      message: 'No SendCert certificate has this ID. Check the ID for typos.',
    });
  }
  const expired = isExpired(cert.expiry_date);
  return json({
    found: true,
    status: expired ? 'expired' : 'valid',
    certificate_id: cert.verify_id,
    recipient_name: cert.recipient_name,
    credential_name: certificateTitle(cert, cert.locale),
    issuer: cert.issuer_name,
    issued_on: cert.issued_date,
    expires_on: cert.expiry_date,
    verification_url: `${SITE_URL}/verify/${cert.verify_id}`,
  });
}

/** A fresh server per request: the HTTP endpoint is stateless. */
export function createMcpServer({ client }: { client?: string } = {}): Server {
  const server = new Server(
    {
      name: 'sendcert',
      title: 'SendCert',
      version: '1.0.0',
      websiteUrl: SITE_URL,
      icons: [{ src: `${SITE_URL}/icon.svg`, mimeType: 'image/svg+xml' }],
    },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as Args;
    try {
      switch (request.params.name) {
        case 'list_certificate_templates':
          return listTemplates(args);
        case 'create_certificate_draft':
          return await createDraft(args, client);
        case 'verify_certificate':
          return await verifyCertificate(args);
        default:
          return toolError(`Unknown tool "${request.params.name}".`);
      }
    } catch (err) {
      if (err instanceof InputError) return toolError(err.message);
      console.error(`MCP tool ${request.params.name} failed:`, err);
      return toolError('SendCert hit an unexpected problem with this request. Please try again.');
    }
  });

  return server;
}
