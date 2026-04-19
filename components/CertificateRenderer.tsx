'use client';

import { forwardRef, type CSSProperties } from 'react';
import type { CertificateContent } from '@/lib/certificateContent';

// Fixed natural dimensions — html2canvas captures at this size so the PDF
// preview is consistent regardless of viewport width.
export const CERT_WIDTH = 1200;
export const CERT_HEIGHT = 900;

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
 * A wrapper component overlays a visual placeholder for WYSIWYG feedback.
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
    // and opts back in with `pointer-events: auto` on its own img. Without
    // this, the full-bleed text container (inset:0) eats pointer events before
    // they can reach the logo sitting behind it.
    pointerEvents: 'none',
  };

  const Inner =
    templateId === 'modern' ? ModernLayout : templateId === 'nature' ? NatureLayout : ClassicLayout;

  return (
    <div ref={ref} style={baseStyle} data-certificate-root>
      <Inner content={content} onLogoMouseDown={onLogoMouseDown} />
    </div>
  );
});

export default CertificateRenderer;

// ---------- LOGO ----------

type LogoProps = {
  content: CertificateContent;
  onMouseDown?: (e: React.MouseEvent) => void;
};

// Logo is positioned by its top-left corner at (logoX%, logoY%). Max height 60
// preserves aspect ratio via CSS. When a mouse-down handler is provided the
// logo becomes draggable in the live editor.
function Logo({ content, onMouseDown }: LogoProps) {
  if (!content.logoDataUrl) return null;
  const style: CSSProperties = {
    position: 'absolute',
    left: `${content.logoX}%`,
    top: `${content.logoY}%`,
    // Height scales with the certificate (logoSize is % of cert height).
    // Width follows the image aspect ratio, capped at 40% of cert width so
    // very wide logos can't dominate the layout.
    height: `${content.logoSize}%`,
    width: 'auto',
    maxWidth: '40%',
    objectFit: 'contain',
    userSelect: 'none',
    ...(onMouseDown
      ? {
          cursor: 'grab',
          pointerEvents: 'auto',
          // Dashed outline signals the logo is draggable.
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
      // Prevent the click from bubbling to the container, which would otherwise
      // interpret it as a "place the recipient name here" gesture.
      onClick={onMouseDown ? (e) => e.stopPropagation() : undefined}
    />
  );
}

type LayoutProps = {
  content: CertificateContent;
  onLogoMouseDown?: (e: React.MouseEvent) => void;
};

// ---------- CLASSIC ----------
function ClassicLayout({ content, onLogoMouseDown }: LayoutProps) {
  const accent = content.accentColor;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #fdfbf4 0%, #f6efdd 100%)',
        padding: 40,
        boxSizing: 'border-box',
        fontFamily: 'Georgia, "Times New Roman", serif',
        color: '#2b2b2b',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', inset: 40, border: `4px solid ${accent}` }} />
      <div style={{ position: 'absolute', inset: 60, border: `1.5px solid ${accent}` }} />
      {[
        { top: 88, left: 88 },
        { top: 88, right: 88 },
        { bottom: 88, left: 88 },
        { bottom: 88, right: 88 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: accent,
            ...pos,
          }}
        />
      ))}

      <Logo content={content} onMouseDown={onLogoMouseDown} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 120px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 20, color: '#6b5b3e', letterSpacing: 4, textTransform: 'uppercase' }}>
          {content.institutionName}
        </div>
        <div style={{ fontSize: 28, color: accent, letterSpacing: 8, marginTop: 30 }}>
          {content.subtitleLabel}
        </div>
        <div style={{ fontSize: 56, fontWeight: 'bold', marginTop: 10, lineHeight: 1.1 }}>
          {content.certificateTitle}
        </div>
        <div style={{ fontSize: 22, color: '#6b5b3e', marginTop: 40 }}>{content.bodyText}</div>
        <div style={{ height: 120 }} />
        <div style={{ width: 600, borderTop: `1px solid ${accent}`, marginTop: 4 }} />
        <div style={{ fontSize: 20, color: '#6b5b3e', marginTop: 40 }}>{content.footerText}</div>
        <div style={{ marginTop: 60, fontSize: 18, color: '#6b5b3e' }}>{content.signerName}</div>
      </div>
    </div>
  );
}

// ---------- MODERN ----------
function ModernLayout({ content, onLogoMouseDown }: LayoutProps) {
  const accent = content.accentColor;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#ffffff',
        fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
        color: '#111827',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 24, background: accent }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 24, background: accent }} />

      <Logo content={content} onMouseDown={onLogoMouseDown} />

      <div style={{ position: 'absolute', inset: 0, padding: '200px 160px', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: accent, letterSpacing: 6 }}>
          {renderModernSubtitle(content)}
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, marginTop: 20, lineHeight: 1.1 }}>
          {content.certificateTitle}
        </div>
        <div style={{ fontSize: 20, color: '#6b7280', marginTop: 30 }}>{content.bodyText}</div>
        <div style={{ height: 130 }} />
        <div style={{ width: '100%', borderTop: `2px solid #e5e7eb`, marginTop: 4 }} />
        <div style={{ fontSize: 18, color: '#6b7280', marginTop: 30 }}>{content.footerText}</div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 60,
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          <div>
            <div style={{ borderTop: '1px solid #111827', width: 280, marginBottom: 8 }} />
            {content.signerName}
          </div>
          <div>
            <div style={{ borderTop: '1px solid #111827', width: 280, marginBottom: 8 }} />
            {content.dateText}
          </div>
        </div>
      </div>
    </div>
  );
}

// Modern's heading combines institution + subtitle with a dot separator.
// Drop the dot when either piece is empty so we don't leave a dangling glyph.
function renderModernSubtitle(content: CertificateContent): string {
  const inst = content.institutionName.trim().toUpperCase();
  const sub = content.subtitleLabel.trim();
  if (inst && sub) return `${inst} · ${sub}`;
  return inst || sub;
}

// ---------- NATURE ----------
function NatureLayout({ content, onLogoMouseDown }: LayoutProps) {
  const accent = content.accentColor;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #ecfdf5 0%, #f7f5ee 100%)',
        fontFamily: 'Georgia, "Times New Roman", serif',
        color: '#1f2937',
        position: 'relative',
      }}
    >
      <svg style={{ position: 'absolute', top: 0, left: 0 }} width="140" height="140" viewBox="0 0 140 140">
        <path d="M0 0 C40 20 60 60 60 100 C20 80 0 40 0 0 Z" fill={accent} opacity={0.5} />
      </svg>
      <svg style={{ position: 'absolute', top: 0, right: 0 }} width="140" height="140" viewBox="0 0 140 140">
        <path d="M140 0 C100 20 80 60 80 100 C120 80 140 40 140 0 Z" fill={accent} opacity={0.5} />
      </svg>
      <svg style={{ position: 'absolute', bottom: 0, left: 0 }} width="140" height="140" viewBox="0 0 140 140">
        <path d="M0 140 C40 120 60 80 60 40 C20 60 0 100 0 140 Z" fill={accent} opacity={0.5} />
      </svg>
      <svg style={{ position: 'absolute', bottom: 0, right: 0 }} width="140" height="140" viewBox="0 0 140 140">
        <path d="M140 140 C100 120 80 80 80 40 C120 60 140 100 140 140 Z" fill={accent} opacity={0.5} />
      </svg>

      <div style={{ position: 'absolute', inset: 80, border: `2px solid ${accent}` }} />

      <Logo content={content} onMouseDown={onLogoMouseDown} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 120px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 22, color: accent, letterSpacing: 4 }}>{content.institutionName}</div>
        <div style={{ fontSize: 28, color: accent, letterSpacing: 8, marginTop: 20 }}>
          {content.subtitleLabel}
        </div>
        <div style={{ fontSize: 52, fontStyle: 'italic', marginTop: 10, lineHeight: 1.1 }}>
          {content.certificateTitle}
        </div>
        <div style={{ fontSize: 22, color: '#4b5563', marginTop: 30 }}>{content.bodyText}</div>
        <div style={{ height: 120 }} />
        <div style={{ width: 600, borderTop: `1px dashed ${accent}`, marginTop: 4 }} />
        <div style={{ fontSize: 20, color: '#4b5563', marginTop: 30 }}>{content.footerText}</div>
        <div style={{ marginTop: 50, fontSize: 18, color: accent }}>{content.signerName}</div>
      </div>
    </div>
  );
}
