// Editable content shared across built-in templates. Every field drives the
// live HTML preview; `CertificateRenderer` decides how each template lays them out.
export type CertificateContent = {
  institutionName: string;
  // Decorative line above the title. Typically "CERTIFICATE" or "~ CERTIFICATE ~".
  // Kept user-editable so the template works in any language.
  subtitleLabel: string;
  certificateTitle: string;
  bodyText: string;
  footerText: string;
  signerName: string;
  // Free-form date/issuance text (primarily for the Modern template's
  // second signer column). Can be "Date issued", "15 March 2026", etc.
  dateText: string;
  accentColor: string;
  logoDataUrl: string | null;
  // Free logo positioning in percent. Origin is the logo's top-left.
  logoX: number;
  logoY: number;
  // Logo height as % of certificate height. Width follows aspect ratio.
  logoSize: number;
};

type Defaults = {
  accent: string;
  subtitle: string;
  title: string;
  body: string;
  footer: string;
  signer: string;
  date: string;
};

function buildDefaults(d: Defaults): CertificateContent {
  return {
    institutionName: 'Example Academy',
    subtitleLabel: d.subtitle,
    certificateTitle: d.title,
    bodyText: d.body,
    footerText: d.footer,
    signerName: d.signer,
    dateText: d.date,
    accentColor: d.accent,
    logoDataUrl: null,
    logoX: 5,
    logoY: 5,
    logoSize: 7,
  };
}

export const DEFAULT_CONTENT_BY_TEMPLATE: Record<string, CertificateContent> = {
  classic: buildDefaults({
    accent: '#8a6d3b',
    subtitle: 'CERTIFICATE',
    title: 'Certificate of Completion',
    body: 'This certificate is awarded in recognition to',
    footer: 'for successfully completing the course.',
    signer: 'Academic Director',
    date: '',
  }),
  modern: buildDefaults({
    accent: '#6366f1',
    subtitle: 'CERTIFICATE',
    title: 'Certificate of Achievement',
    body: 'This certificate is awarded with recognition to',
    footer: 'for dedication and commitment throughout the training.',
    signer: 'Academic Director',
    date: 'Date issued',
  }),
  nature: buildDefaults({
    accent: '#065f46',
    subtitle: '~ CERTIFICATE ~',
    title: 'Certificate of Participation',
    body: 'This certificate is gratefully awarded to',
    footer: 'for their enthusiasm and active participation in the workshop.',
    signer: 'Workshop Lead',
    date: '',
  }),
};

export function getDefaultContent(templateId: string): CertificateContent {
  return (
    DEFAULT_CONTENT_BY_TEMPLATE[templateId] ??
    DEFAULT_CONTENT_BY_TEMPLATE.classic
  );
}
