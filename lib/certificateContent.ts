import type { Locale } from '@/lib/i18n';

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

function buildDefaults(d: Defaults, locale: Locale = 'en'): CertificateContent {
  return {
    institutionName: locale === 'es' ? 'Academia Ejemplo' : 'Example Academy',
    subtitleLabel: d.subtitle,
    certificateTitle: d.title,
    bodyText: d.body,
    footerText: d.footer,
    signerName: d.signer,
    dateText: locale === 'es' ? 'Fecha' : 'Date',
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

// Neutral Latin American Spanish defaults (same accents as English).
export const DEFAULT_CONTENT_BY_TEMPLATE_ES: Record<string, CertificateContent> = {
  elegant: buildDefaults(
    {
      accent: '#1e3a5f',
      subtitle: 'Certificado de',
      title: 'Reconocimiento',
      body: 'Este certificado se otorga con orgullo a',
      footer: 'por su destacado desempeño y la finalización exitosa del programa.',
      signer: 'Director del programa',
    },
    'es',
  ),
  minimal: buildDefaults(
    {
      accent: '#0f766e',
      subtitle: 'Certificado oficial',
      title: 'Certificado de finalización',
      body: 'Se certifica que',
      footer: 'completó con éxito el curso.',
      signer: 'Instructor',
    },
    'es',
  ),
  bold: buildDefaults(
    {
      accent: '#4f46e5',
      subtitle: 'Certificado',
      title: 'de excelencia',
      body: 'Otorgado con orgullo a',
      footer: 'por completar el programa y demostrar habilidades sobresalientes.',
      signer: 'Instructor principal',
    },
    'es',
  ),
  academic: buildDefaults(
    {
      accent: '#7f1d1d',
      subtitle: 'Certificado',
      title: 'de finalización',
      body: 'Se certifica que',
      footer: 'cumplió satisfactoriamente con todos los requisitos del curso.',
      signer: 'Director académico',
    },
    'es',
  ),
  corporate: buildDefaults(
    {
      accent: '#2563eb',
      subtitle: 'Certificado',
      title: 'Capacitación completada',
      body: 'Se certifica que',
      footer: 'completó la capacitación requerida y cumplió todos los criterios de evaluación.',
      signer: 'Responsable de capacitación',
    },
    'es',
  ),
  friendly: buildDefaults(
    {
      accent: '#ea580c',
      subtitle: '¡Bien hecho!',
      title: 'Certificado de participación',
      body: 'Este certificado se otorga a',
      footer: 'por participar en el taller con entusiasmo y creatividad.',
      signer: 'Coordinador del taller',
    },
    'es',
  ),
};

export function getDefaultContent(templateId: string, locale: Locale = 'en'): CertificateContent {
  const table = locale === 'es' ? DEFAULT_CONTENT_BY_TEMPLATE_ES : DEFAULT_CONTENT_BY_TEMPLATE;
  return table[templateId] ?? table.elegant;
}
