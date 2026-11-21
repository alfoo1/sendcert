'use client';

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { getDefaultContent, type CertificateContent } from '@/lib/certificateContent';
import { PRESET_TEMPLATES, type NameFont } from '@/lib/templates';
import { sans, serif } from '@/components/landing/fonts';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { Locale } from '@/lib/i18n';

// Natural size of every template: US Letter landscape at 1200px wide.
// html2canvas captures at this size, so the PDF matches the preview.
import { CERT_HEIGHT, CERT_WIDTH } from '@/lib/certificateSize';

export { CERT_HEIGHT, CERT_WIDTH };

const SANS = sans.style.fontFamily;
const SERIF = serif.style.fontFamily;

// Layout grid shared by all templates. The recipient name (drawn by pdf-lib,
// not here) is centered at 50% / 50%; the default Signature and Date overlays
// sit at x = 25% / 75%, y = 85%, right above the signature lines.
const BODY_BOTTOM = 410;
const NAME_RULE_TOP = 514;
const FOOTER_TOP = 534;
const SIGNATURE_LINE_TOP = 812;

type Props = {
  templateId: string;
  content: CertificateContent;
  // When provided, the visible instance wires the logo to a drag handler.
  // The hidden capture instance omits this so html2canvas gets a clean render.
  onLogoMouseDown?: (e: React.MouseEvent) => void;
};

/**
 * Renders the certificate template body as live HTML.
 *
 * Intentionally does NOT render the recipient's name — that text is drawn
 * server-side by pdf-lib (vector quality) on top of the captured image.
 * Uses inline styles only so html2canvas reproduces it exactly.
 */
const CertificateRenderer = forwardRef<HTMLDivElement, Props>(function CertificateRenderer(
  { templateId, content, onLogoMouseDown },
  ref,
) {
  const baseStyle: CSSProperties = {
    width: `${CERT_WIDTH}px`,
    height: `${CERT_HEIGHT}px`,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    // Everything inside is decorative. The logo is the only interactive piece
    // and opts back in with `pointer-events: auto` on its own img.
    pointerEvents: 'none',
  };

  const Layout = LAYOUTS[templateId] ?? ElegantLayout;

  return (
    <div ref={ref} style={baseStyle} data-certificate-root>
      <Layout content={content} />
      <Logo content={content} onMouseDown={onLogoMouseDown} />
    </div>
  );
});

export default CertificateRenderer;

// ---------- Thumbnail ----------

const NAME_FONTS: Record<NameFont, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  times: '"Times New Roman", Times, serif',
  courier: '"Courier New", Courier, monospace',
};

/**
 * Scaled-down live render of a built-in template with a sample name, used by
 * the template picker and the landing gallery so thumbnails always match the
 * real design.
 */
export function TemplateThumbnail({
  templateId,
  sampleName,
  locale: localeProp,
}: {
  templateId: string;
  sampleName?: string;
  // Optional: defaults to the surrounding LocaleProvider (English if none).
  locale?: Locale;
}) {
  const contextLocale = useLocale();
  const locale = localeProp ?? contextLocale;
  const name = sampleName ?? (locale === 'es' ? 'María González' : 'Maria Johnson');
  const preset = PRESET_TEMPLATES.find((p) => p.id === templateId);
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / CERT_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${CERT_WIDTH} / ${CERT_HEIGHT}`,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: CERT_WIDTH,
          height: CERT_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          // Hidden until measured, so the server render never flashes a
          // full-size certificate.
          visibility: scale ? 'visible' : 'hidden',
        }}
      >
        <CertificateRenderer templateId={templateId} content={getDefaultContent(templateId, locale)} />
        {preset && (
          <div
            style={{
              position: 'absolute',
              left: `${preset.defaultX}%`,
              top: `${preset.defaultY}%`,
              transform: 'translate(-50%, -50%)',
              whiteSpace: 'nowrap',
              fontSize: preset.defaultFontSize,
              fontWeight: 700,
              color: preset.defaultColor,
              fontFamily: NAME_FONTS[preset.defaultFontFamily],
            }}
          >
            {name}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Logo ----------

// Logo is positioned by its top-left corner at (logoX%, logoY%). Height is a
// percent of the certificate, width follows the image's aspect ratio. When a
// mouse-down handler is provided the logo becomes draggable in the editor.
function Logo({
  content,
  onMouseDown,
}: {
  content: CertificateContent;
  onMouseDown?: (e: React.MouseEvent) => void;
}) {
  if (!content.logoDataUrl) return null;
  const style: CSSProperties = {
    position: 'absolute',
    left: `${content.logoX}%`,
    top: `${content.logoY}%`,
    height: `${content.logoSize}%`,
    width: 'auto',
    maxWidth: '40%',
    objectFit: 'contain',
    userSelect: 'none',
    ...(onMouseDown
      ? {
          cursor: 'grab',
          pointerEvents: 'auto',
          outline: '2px dashed rgba(79, 70, 229, 0.45)',
          outlineOffset: '4px',
        }
      : { pointerEvents: 'none' }),
  };
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={content.logoDataUrl}
      alt="logo"
      style={style}
      draggable={false}
      onMouseDown={onMouseDown}
      // Keep the click from reaching the container, which would move the name.
      onClick={onMouseDown ? (e) => e.stopPropagation() : undefined}
    />
  );
}

// ---------- Shared building blocks ----------

/** Turns the user's hex accent into a translucent tint; falls back to the raw value. */
function tint(hex: string, alpha: number): string {
  const raw = hex.trim().replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return hex;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Centered text block whose top edge sits at `top`. */
function TopText({
  top,
  inset = 150,
  style,
  children,
}: {
  top: number;
  inset?: number;
  style: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: inset,
        right: inset,
        textAlign: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Centered text block that ends at `bottom`, so longer text grows upward, away from the name. */
function BottomText({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: CERT_HEIGHT - BODY_BOTTOM,
        left: 170,
        right: 170,
        textAlign: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Horizontal rule centered on the certificate. */
function Rule({ top, width, height = 1, color, radius = 0 }: {
  top: number;
  width: number;
  height?: number;
  color: string;
  radius?: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: (CERT_WIDTH - width) / 2,
        width,
        height,
        backgroundColor: color,
        borderRadius: radius,
      }}
    />
  );
}

/** Two signature lines at 25% / 75% with the signer and date captions under them. */
function SignatureRow({
  content,
  lineColor,
  lineWeight = 1,
  caption,
}: {
  content: CertificateContent;
  lineColor: string;
  lineWeight?: number;
  caption: CSSProperties;
}) {
  const columns = [
    { center: CERT_WIDTH * 0.25, label: content.signerName },
    { center: CERT_WIDTH * 0.75, label: content.dateText },
  ];
  return (
    <>
      {columns.map((col) => (
        <div
          key={col.center}
          style={{
            position: 'absolute',
            top: SIGNATURE_LINE_TOP,
            left: col.center - 150,
            width: 300,
            textAlign: 'center',
          }}
        >
          <div style={{ height: lineWeight, backgroundColor: lineColor }} />
          {col.label && <div style={{ marginTop: 10, ...caption }}>{col.label}</div>}
        </div>
      ))}
    </>
  );
}

function Circle({ left, top, size, style }: {
  left: number;
  top: number;
  size: number;
  style: CSSProperties;
}) {
  return (
    <div
      style={{ position: 'absolute', left, top, width: size, height: size, borderRadius: '50%', ...style }}
    />
  );
}

type LayoutProps = { content: CertificateContent };

// ---------- Elegant: navy frame, gold details, serif title ----------
function ElegantLayout({ content }: LayoutProps) {
  const accent = content.accentColor;
  const gold = '#b8913a';
  const cornerOffset = 66;
  return (
    <>
      <div style={{ position: 'absolute', inset: 26, border: `12px solid ${accent}` }} />
      <div style={{ position: 'absolute', inset: 50, border: `2px solid ${gold}` }} />
      <div style={{ position: 'absolute', inset: 57, border: `1px solid ${gold}` }} />
      {[
        { top: cornerOffset, left: cornerOffset },
        { top: cornerOffset, right: cornerOffset },
        { bottom: cornerOffset, left: cornerOffset },
        { bottom: cornerOffset, right: cornerOffset },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            backgroundColor: gold,
            transform: 'rotate(45deg)',
            ...pos,
          }}
        />
      ))}

      <TopText
        top={118}
        style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, letterSpacing: '0.32em', textTransform: 'uppercase', color: accent }}
      >
        {content.institutionName}
      </TopText>
      <TopText
        top={176}
        style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, letterSpacing: '0.42em', textTransform: 'uppercase', color: gold }}
      >
        {content.subtitleLabel}
      </TopText>
      <TopText
        top={198}
        style={{ fontFamily: SERIF, fontSize: 68, fontWeight: 600, lineHeight: 1.1, color: accent }}
      >
        {content.certificateTitle}
      </TopText>
      <div
        style={{
          position: 'absolute',
          top: 296,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ width: 90, height: 1, backgroundColor: gold }} />
        <div style={{ width: 9, height: 9, backgroundColor: gold, transform: 'rotate(45deg)' }} />
        <div style={{ width: 90, height: 1, backgroundColor: gold }} />
      </div>

      <BottomText style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 22, color: '#4b5563' }}>
        {content.bodyText}
      </BottomText>
      <Rule top={NAME_RULE_TOP} width={560} color={gold} />
      <TopText
        top={FOOTER_TOP}
        inset={260}
        style={{ fontFamily: SANS, fontSize: 17, lineHeight: 1.55, color: '#4b5563' }}
      >
        {content.footerText}
      </TopText>

      <SignatureRow
        content={content}
        lineColor={accent}
        caption={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6b7280' }}
      />
    </>
  );
}

// ---------- Minimal: white space, thin frame, one accent ----------
function MinimalLayout({ content }: LayoutProps) {
  const accent = content.accentColor;
  return (
    <>
      <div style={{ position: 'absolute', inset: 36, border: '1px solid #e5e7eb' }} />
      <Rule top={110} width={48} height={4} radius={2} color={accent} />

      <TopText
        top={136}
        style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#6b7280' }}
      >
        {content.institutionName}
      </TopText>
      <TopText
        top={186}
        style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, letterSpacing: '0.34em', textTransform: 'uppercase', color: accent }}
      >
        {content.subtitleLabel}
      </TopText>
      <TopText
        top={210}
        style={{ fontFamily: SANS, fontSize: 52, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', color: '#111827' }}
      >
        {content.certificateTitle}
      </TopText>

      <BottomText style={{ fontFamily: SANS, fontSize: 19, color: '#6b7280' }}>
        {content.bodyText}
      </BottomText>
      <Rule top={NAME_RULE_TOP} width={460} color="#d1d5db" />
      <TopText
        top={FOOTER_TOP}
        inset={260}
        style={{ fontFamily: SANS, fontSize: 17, lineHeight: 1.55, color: '#6b7280' }}
      >
        {content.footerText}
      </TopText>

      <SignatureRow
        content={content}
        lineColor="#d1d5db"
        caption={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9ca3af' }}
      />
    </>
  );
}

// ---------- Bold: large color shapes, heavy sans title ----------
function BoldLayout({ content }: LayoutProps) {
  const accent = content.accentColor;
  return (
    <>
      <Circle left={920} top={-200} size={480} style={{ backgroundColor: accent }} />
      <Circle left={868} top={232} size={84} style={{ border: `3px solid ${tint(accent, 0.35)}` }} />
      <Circle left={-260} top={660} size={400} style={{ backgroundColor: tint(accent, 0.12) }} />

      <TopText
        top={120}
        style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: accent }}
      >
        {content.institutionName}
      </TopText>
      <TopText
        top={172}
        style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#94a3b8' }}
      >
        {content.subtitleLabel}
      </TopText>
      <TopText
        top={196}
        inset={240}
        style={{ fontFamily: SANS, fontSize: 66, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#0f172a' }}
      >
        {content.certificateTitle}
      </TopText>

      <BottomText style={{ fontFamily: SANS, fontSize: 19, fontWeight: 500, color: '#475569' }}>
        {content.bodyText}
      </BottomText>
      <Rule top={NAME_RULE_TOP - 2} width={96} height={6} radius={3} color={accent} />
      <TopText
        top={FOOTER_TOP + 4}
        inset={260}
        style={{ fontFamily: SANS, fontSize: 17, lineHeight: 1.55, color: '#475569' }}
      >
        {content.footerText}
      </TopText>

      <SignatureRow
        content={content}
        lineColor="#0f172a"
        lineWeight={2}
        caption={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#64748b' }}
      />
    </>
  );
}

// ---------- Academic: double rule, serif type, seal ----------
function AcademicLayout({ content }: LayoutProps) {
  const accent = content.accentColor;
  const sealCenterY = 792;
  return (
    <>
      <div style={{ position: 'absolute', inset: 30, border: `3px solid ${accent}` }} />
      <div style={{ position: 'absolute', inset: 40, border: `1px solid ${accent}` }} />

      <TopText top={112} style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: accent }}>
        {content.institutionName}
      </TopText>
      <TopText
        top={168}
        style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, letterSpacing: '0.42em', textTransform: 'uppercase', color: '#6b7280' }}
      >
        {content.subtitleLabel}
      </TopText>
      <TopText
        top={188}
        style={{ fontFamily: SERIF, fontSize: 62, fontStyle: 'italic', fontWeight: 600, lineHeight: 1.1, color: '#111827' }}
      >
        {content.certificateTitle}
      </TopText>
      <Rule top={292} width={120} color={accent} />

      <BottomText style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 21, color: '#4b5563' }}>
        {content.bodyText}
      </BottomText>
      <Rule top={NAME_RULE_TOP} width={600} color={accent} />
      <TopText
        top={FOOTER_TOP}
        inset={250}
        style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.55, color: '#4b5563' }}
      >
        {content.footerText}
      </TopText>

      {/* Seal with ribbon tails, centered between the signature lines. */}
      {[-1, 1].map((side) => (
        <div
          key={side}
          style={{
            position: 'absolute',
            top: sealCenterY + 20,
            left: CERT_WIDTH / 2 - 13 + side * 18,
            width: 26,
            height: 58,
            backgroundColor: accent,
            transform: `rotate(${side * 18}deg)`,
          }}
        />
      ))}
      <Circle
        left={CERT_WIDTH / 2 - 59}
        top={sealCenterY - 59}
        size={118}
        style={{ backgroundColor: '#ffffff', border: `3px solid ${accent}` }}
      />
      <Circle
        left={CERT_WIDTH / 2 - 44}
        top={sealCenterY - 44}
        size={88}
        style={{ backgroundColor: tint(accent, 0.08), border: `1px solid ${accent}` }}
      />
      <Circle
        left={CERT_WIDTH / 2 - 14}
        top={sealCenterY - 14}
        size={28}
        style={{ backgroundColor: accent }}
      />

      <SignatureRow
        content={content}
        lineColor={accent}
        caption={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: '#4b5563' }}
      />
    </>
  );
}

// ---------- Corporate: top accent bar, dark base band ----------
function CorporateLayout({ content }: LayoutProps) {
  const accent = content.accentColor;
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12, backgroundColor: accent }} />
      <div style={{ position: 'absolute', top: 861, left: 0, right: 0, height: 6, backgroundColor: accent }} />
      <div style={{ position: 'absolute', top: 867, left: 0, right: 0, bottom: 0, backgroundColor: '#0f172a' }} />

      <TopText
        top={112}
        style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#0f172a' }}
      >
        {content.institutionName}
      </TopText>
      <TopText
        top={162}
        style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, letterSpacing: '0.34em', textTransform: 'uppercase', color: accent }}
      >
        {content.subtitleLabel}
      </TopText>
      <TopText
        top={186}
        style={{ fontFamily: SANS, fontSize: 52, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.01em', color: '#0f172a' }}
      >
        {content.certificateTitle}
      </TopText>
      <Rule top={268} width={64} height={3} color={accent} />

      <BottomText style={{ fontFamily: SANS, fontSize: 19, color: '#475569' }}>
        {content.bodyText}
      </BottomText>
      <Rule top={NAME_RULE_TOP} width={520} color="#cbd5e1" />
      <TopText
        top={FOOTER_TOP}
        inset={250}
        style={{ fontFamily: SANS, fontSize: 17, lineHeight: 1.55, color: '#475569' }}
      >
        {content.footerText}
      </TopText>

      <SignatureRow
        content={content}
        lineColor="#94a3b8"
        caption={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#64748b' }}
      />
    </>
  );
}

// ---------- Friendly: rounded frame, confetti, pill label ----------
const CONFETTI: { left: number; top: number; size: number; color: 'accent' | string; square?: boolean }[] = [
  { left: 1036, top: 78, size: 22, color: 'accent' },
  { left: 1088, top: 124, size: 14, color: '#14b8a6' },
  { left: 1004, top: 142, size: 12, color: '#facc15', square: true },
  { left: 1100, top: 74, size: 10, color: '#ec4899' },
  { left: 1124, top: 430, size: 14, color: '#facc15' },
  { left: 66, top: 428, size: 12, color: 'accent', square: true },
  { left: 92, top: 690, size: 18, color: '#facc15' },
  { left: 72, top: 752, size: 12, color: '#6366f1' },
  { left: 118, top: 760, size: 10, color: 'accent' },
  { left: 1082, top: 694, size: 16, color: '#ec4899', square: true },
  { left: 1112, top: 756, size: 12, color: '#14b8a6' },
  { left: 1060, top: 746, size: 10, color: 'accent' },
];

function FriendlyLayout({ content }: LayoutProps) {
  const accent = content.accentColor;
  return (
    <>
      <div style={{ position: 'absolute', inset: 28, border: `8px solid ${accent}`, borderRadius: 40 }} />
      {CONFETTI.map((dot, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            borderRadius: dot.square ? 3 : '50%',
            transform: dot.square ? 'rotate(20deg)' : undefined,
            backgroundColor: dot.color === 'accent' ? accent : dot.color,
          }}
        />
      ))}

      <TopText
        top={118}
        style={{ fontFamily: SANS, fontSize: 16, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: accent }}
      >
        {content.institutionName}
      </TopText>
      <TopText top={160} style={{}}>
        {content.subtitleLabel && (
          <span
            style={{
              display: 'inline-block',
              padding: '7px 18px',
              borderRadius: 999,
              backgroundColor: tint(accent, 0.12),
              color: accent,
              fontFamily: SANS,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {content.subtitleLabel}
          </span>
        )}
      </TopText>
      <TopText
        top={208}
        style={{ fontFamily: SANS, fontSize: 56, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#1f2937' }}
      >
        {content.certificateTitle}
      </TopText>

      <BottomText style={{ fontFamily: SANS, fontSize: 20, fontWeight: 500, color: '#4b5563' }}>
        {content.bodyText}
      </BottomText>
      <Rule top={NAME_RULE_TOP} width={460} height={3} radius={2} color={tint(accent, 0.35)} />
      <TopText
        top={FOOTER_TOP + 2}
        inset={250}
        style={{ fontFamily: SANS, fontSize: 18, lineHeight: 1.5, color: '#4b5563' }}
      >
        {content.footerText}
      </TopText>

      <SignatureRow
        content={content}
        lineColor="#e5e7eb"
        lineWeight={2}
        caption={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: '#6b7280' }}
      />
    </>
  );
}

const LAYOUTS: Record<string, (props: LayoutProps) => JSX.Element> = {
  elegant: ElegantLayout,
  minimal: MinimalLayout,
  bold: BoldLayout,
  academic: AcademicLayout,
  corporate: CorporateLayout,
  friendly: FriendlyLayout,
};
