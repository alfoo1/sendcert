// Editable content shared across built-in templates. Every field drives the
// live HTML preview; `CertificateRenderer` decides how each template lays them out.
export type CertificateContent = {
  institutionName: string;
  // Short line shown with the title (e.g. "Certificate of" above "Achievement").
  // Kept user-editable so the template works in any language.
  subtitleLabel: string;
  certificateTitle: string;
  bodyText: string;
  footerText: string;
  // Caption under the left signature line.
  signerName: string;
  // Caption under the right signature line. Hidden when empty.
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
};

function buildDefaults(d: Defaults): CertificateContent {
  return {
    institutionName: 'Example Academy',
    subtitleLabel: d.subtitle,
    certificateTitle: d.title,
    bodyText: d.body,
    footerText: d.footer,
    signerName: d.signer,
    dateText: 'Date',
    accentColor: d.accent,
    logoDataUrl: null,
    logoX: 5,
    logoY: 5,
    logoSize: 7,
  };
}

export const DEFAULT_CONTENT_BY_TEMPLATE: Record<string, CertificateContent> = {
  elegant: buildDefaults({
    accent: '#1e3a5f',
    subtitle: 'Certificate of',
    title: 'Achievement',
    body: 'This certificate is proudly presented to',
    footer: 'for outstanding performance and successful completion of the program.',
    signer: 'Program Director',
  }),
  minimal: buildDefaults({
    accent: '#0f766e',
    subtitle: 'Official certificate',
    title: 'Certificate of Completion',
    body: 'This is to certify that',
    footer: 'has successfully completed the course.',
    signer: 'Instructor',
  }),
  bold: buildDefaults({
    accent: '#4f46e5',
    subtitle: 'Certificate',
    title: 'of Excellence',
    body: 'Proudly presented to',
    footer: 'for completing the program and demonstrating outstanding skills.',
    signer: 'Lead Instructor',
  }),
  academic: buildDefaults({
    accent: '#7f1d1d',
    subtitle: 'Certificate',
    title: 'of Completion',
    body: 'This is to certify that',
    footer: 'has satisfactorily completed all the requirements of the course.',
    signer: 'Dean of Studies',
  }),
  corporate: buildDefaults({
    accent: '#2563eb',
    subtitle: 'Certificate',
    title: 'Training Completion',
    body: 'This certifies that',
    footer: 'has completed the required training and met all assessment criteria.',
    signer: 'Training Manager',
  }),
  friendly: buildDefaults({
    accent: '#ea580c',
    subtitle: 'Well done!',
    title: 'Certificate of Participation',
    body: 'This certificate is presented to',
    footer: 'for taking part in the workshop with enthusiasm and creativity.',
    signer: 'Workshop Leader',
  }),
};

export function getDefaultContent(templateId: string): CertificateContent {
  return DEFAULT_CONTENT_BY_TEMPLATE[templateId] ?? DEFAULT_CONTENT_BY_TEMPLATE.elegant;
}
