'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { PRESET_TEMPLATES } from '@/lib/templates';
import type { CertificateContent } from '@/lib/certificateContent';
import CertificateRenderer, {
  CERT_WIDTH,
  CERT_HEIGHT,
} from './CertificateRenderer';

export type TextConfig = {
  x: number; // percentage 0-100 (center of text)
  y: number;
  fontSize: number;
  color: string;
  fontFamily: 'helvetica' | 'times' | 'courier';
};

type Props = {
  templateDataUrl: string | null;
  templateId: string | null;
  textConfig: TextConfig;
  onConfigChange: (cfg: TextConfig) => void;
  // Content is only editable for built-in templates. For custom uploads we
  // pass null and hide the content-editing section.
  content: CertificateContent | null;
  onContentChange: (c: CertificateContent) => void;
  // Ref attached to the HIDDEN natural-size certificate copy. html2canvas
  // captures that copy (not the visible scaled one) so the rendered bitmap
  // is always 1200x900 regardless of the viewport.
  certificateRef: React.RefObject<HTMLDivElement>;
};

const SAMPLE_NAME = 'Maria Johnson';
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

// Drag state describes which handle (if any) is being dragged. The offset
// captured on mousedown keeps the cursor pinned to the same point on the
// dragged element as it moves.
type DragTarget = null | 'name' | 'logo';
type DragOffset = { dxPct: number; dyPct: number };

export default function ConfigStep({
  templateDataUrl,
  templateId,
  textConfig,
  onConfigChange,
  content,
  onContentChange,
  certificateRef,
}: Props) {
  const isBuiltInTemplate = Boolean(templateId && !templateDataUrl);
  const customImageSrc = templateDataUrl;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [dragOffset, setDragOffset] = useState<DragOffset>({ dxPct: 0, dyPct: 0 });

  const [nameSectionOpen, setNameSectionOpen] = useState(true);
  const [contentSectionOpen, setContentSectionOpen] = useState(isBuiltInTemplate);

  // Measure rendered container so we can scale both preview font size and the
  // hidden-to-visible transform ratio.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      if (el.clientWidth > 0) setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = containerSize ? containerSize.w / CERT_WIDTH : 1;

  const pointToPercent = useCallback((e: MouseEvent | React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  }, []);

  // Global drag listeners — live on window so the drag survives the cursor
  // briefly leaving the container bounds.
  useEffect(() => {
    if (!dragTarget) return;

    function handleMove(e: MouseEvent) {
      const pct = pointToPercent(e);
      if (!pct) return;
      if (dragTarget === 'name') {
        // Name uses center anchor, so no offset needed for the drag feel.
        onConfigChange({ ...textConfig, x: pct.x, y: pct.y });
      } else if (dragTarget === 'logo' && content) {
        // Logo uses top-left anchor. Apply the mousedown offset so the cursor
        // stays glued to the same point on the logo during the drag.
        const nextX = Math.max(0, Math.min(100, pct.x - dragOffset.dxPct));
        const nextY = Math.max(0, Math.min(100, pct.y - dragOffset.dyPct));
        onContentChange({ ...content, logoX: nextX, logoY: nextY });
      }
    }
    function handleUp() {
      setDragTarget(null);
    }

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragTarget, dragOffset, textConfig, content, onConfigChange, onContentChange, pointToPercent]);

  function handleNameMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget('name');
    setDragOffset({ dxPct: 0, dyPct: 0 });
  }

  function handleLogoMouseDown(e: React.MouseEvent) {
    if (!content) return;
    e.preventDefault();
    e.stopPropagation();
    const pct = pointToPercent(e);
    if (!pct) return;
    // Offset between cursor and logo's top-left at mousedown, in percent.
    setDragOffset({
      dxPct: pct.x - content.logoX,
      dyPct: pct.y - content.logoY,
    });
    setDragTarget('logo');
  }

  // Click on empty area places the name (legacy behavior). Ignores clicks while
  // a drag is in flight or we'd overwrite the user's intentional position.
  function handleContainerClick(e: React.MouseEvent<HTMLDivElement>) {
    if (dragTarget) return;
    const pct = pointToPercent(e);
    if (pct) onConfigChange({ ...textConfig, x: pct.x, y: pct.y });
  }

  function updateText<K extends keyof TextConfig>(key: K, value: TextConfig[K]) {
    onConfigChange({ ...textConfig, [key]: value });
  }

  function updateContent<K extends keyof CertificateContent>(
    key: K,
    value: CertificateContent[K],
  ) {
    if (!content) return;
    onContentChange({ ...content, [key]: value });
  }

  const previewFontSize = textConfig.fontSize * scale;

  // Logo dropzone
  const onLogoDrop = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file || !content) return;
      if (file.size > MAX_LOGO_BYTES) {
        alert('Logo is too large. Max 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onContentChange({ ...content, logoDataUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
    },
    [content, onContentChange],
  );
  const logoDrop = useDropzone({
    onDrop: onLogoDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/svg+xml': ['.svg'],
    },
    maxFiles: 1,
  });

  const isDraggingCursor = dragTarget === 'name' ? 'cursor-grabbing' : 'cursor-crosshair';

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* ---------- LEFT: live preview ---------- */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {isBuiltInTemplate ? 'Customize your certificate' : "Place the recipient's name"}
        </h2>
        <p className="mt-1 text-gray-600">
          Drag the name or logo on the certificate to position them, or use the X/Y
          inputs on the right.
        </p>

        <div
          ref={containerRef}
          onClick={handleContainerClick}
          className={`relative mt-6 select-none overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${isDraggingCursor}`}
          style={{
            aspectRatio: `${CERT_WIDTH} / ${CERT_HEIGHT}`,
            width: '100%',
          }}
        >
          {/* Visible scaled copy — for user interaction only. */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: CERT_WIDTH,
              height: CERT_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {isBuiltInTemplate && content && templateId ? (
              <CertificateRenderer
                templateId={templateId}
                content={content}
                onLogoMouseDown={handleLogoMouseDown}
              />
            ) : customImageSrc ? (
              <div
                style={{
                  width: CERT_WIDTH,
                  height: CERT_HEIGHT,
                  position: 'relative',
                  background: '#fff',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={customImageSrc}
                  alt="template"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                  draggable={false}
                />
              </div>
            ) : null}
          </div>

          {(isBuiltInTemplate || customImageSrc) && (
            <>
              {/* Draggable name overlay — coords are container-percent */}
              <div
                onMouseDown={handleNameMouseDown}
                className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-2 py-1 transition-shadow ${
                  dragTarget === 'name'
                    ? 'cursor-grabbing ring-2 ring-brand-500 ring-offset-2'
                    : 'cursor-grab hover:ring-2 hover:ring-brand-300 hover:ring-offset-2'
                }`}
                style={{
                  left: `${textConfig.x}%`,
                  top: `${textConfig.y}%`,
                  fontSize: `${previewFontSize}px`,
                  color: textConfig.color,
                  fontFamily:
                    textConfig.fontFamily === 'times'
                      ? 'Georgia, serif'
                      : textConfig.fontFamily === 'courier'
                        ? 'ui-monospace, Menlo, monospace'
                        : 'Helvetica, Arial, sans-serif',
                  fontWeight: 700,
                }}
              >
                {SAMPLE_NAME}
              </div>
              <div
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600 ring-2 ring-white"
                style={{ left: `${textConfig.x}%`, top: `${textConfig.y}%` }}
              />
            </>
          )}

          {!isBuiltInTemplate && !customImageSrc && (
            <div className="flex h-full items-center justify-center text-gray-400">
              No template selected
            </div>
          )}
        </div>
      </div>

      {/* ---------- Hidden natural-size copy (capture target) ----------
          Rendered outside the scaled wrapper and off-screen so html2canvas
          gets a clean, full-resolution snapshot with no transform quirks.
          Positioned far to the left with explicit 1200x900 dimensions. */}
      {isBuiltInTemplate && content && templateId && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: 0,
            left: -99999,
            width: CERT_WIDTH,
            height: CERT_HEIGHT,
            pointerEvents: 'none',
            // Avoid forcing the viewport scrollbar
            overflow: 'hidden',
            zIndex: -1,
          }}
        >
          <CertificateRenderer
            ref={certificateRef}
            templateId={templateId}
            content={content}
          />
        </div>
      )}

      {/* ---------- RIGHT sidebar ---------- */}
      <div className="space-y-4">
        {/* Section 1: recipient name */}
        <CollapsibleSection
          title="Recipient name"
          open={nameSectionOpen}
          onToggle={() => setNameSectionOpen((v) => !v)}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Font</label>
            <select
              value={textConfig.fontFamily}
              onChange={(e) =>
                updateText('fontFamily', e.target.value as TextConfig['fontFamily'])
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="helvetica">Helvetica (sans-serif)</option>
              <option value="times">Times Roman (serif)</option>
              <option value="courier">Courier (monospace)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Size: {textConfig.fontSize}pt
            </label>
            <input
              type="range"
              min={12}
              max={120}
              step={1}
              value={textConfig.fontSize}
              onChange={(e) => updateText('fontSize', Number(e.target.value))}
              className="mt-1 w-full accent-brand-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Color</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                value={textConfig.color}
                onChange={(e) => updateText('color', e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300"
              />
              <input
                type="text"
                value={textConfig.color}
                onChange={(e) => updateText('color', e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">X (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={textConfig.x.toFixed(1)}
                onChange={(e) => updateText('x', Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Y (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={textConfig.y.toFixed(1)}
                onChange={(e) => updateText('y', Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 2: certificate content */}
        {isBuiltInTemplate && content && (
          <CollapsibleSection
            title="Certificate content"
            open={contentSectionOpen}
            onToggle={() => setContentSectionOpen((v) => !v)}
          >
            <Field label="Institution name">
              <input
                type="text"
                value={content.institutionName}
                onChange={(e) => updateContent('institutionName', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Subtitle / kicker">
              <input
                type="text"
                value={content.subtitleLabel}
                onChange={(e) => updateContent('subtitleLabel', e.target.value)}
                placeholder="CERTIFICATE"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Certificate title">
              <input
                type="text"
                value={content.certificateTitle}
                onChange={(e) => updateContent('certificateTitle', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Body text">
              <textarea
                rows={2}
                value={content.bodyText}
                onChange={(e) => updateContent('bodyText', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Footer text">
              <textarea
                rows={2}
                value={content.footerText}
                onChange={(e) => updateContent('footerText', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Signer name">
              <input
                type="text"
                value={content.signerName}
                onChange={(e) => updateContent('signerName', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </Field>

            {/* Date field only appears in the Modern layout. Hiding it for
                other templates avoids a dead input that the user types into
                and sees no effect in the preview. */}
            {templateId === 'modern' && (
              <Field label="Date / issuance text">
                <input
                  type="text"
                  value={content.dateText}
                  onChange={(e) => updateContent('dateText', e.target.value)}
                  placeholder="Date issued"
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
            )}

            <Field label="Accent color">
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  value={content.accentColor}
                  onChange={(e) => updateContent('accentColor', e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={content.accentColor}
                  onChange={(e) => updateContent('accentColor', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono"
                />
              </div>
            </Field>

            {/* Logo upload + free positioning */}
            <Field label="Logo (optional)">
              <div
                {...logoDrop.getRootProps()}
                className={`mt-1 cursor-pointer rounded-lg border-2 border-dashed p-3 text-center text-xs transition ${
                  logoDrop.isDragActive
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-gray-300 bg-white hover:border-brand-400'
                }`}
              >
                <input {...logoDrop.getInputProps()} />
                {content.logoDataUrl ? (
                  <div className="flex items-center justify-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={content.logoDataUrl}
                      alt="logo preview"
                      className="h-8 w-auto object-contain"
                    />
                    <span className="text-gray-600">Click to replace · PNG/JPG/SVG, max 2MB</span>
                  </div>
                ) : (
                  <span className="text-gray-600">
                    Drop a logo or click · PNG/JPG/SVG, max 2MB
                  </span>
                )}
              </div>

              {content.logoDataUrl && (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Logo X (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={content.logoX.toFixed(1)}
                        onChange={(e) => updateContent('logoX', Number(e.target.value))}
                        className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Logo Y (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={content.logoY.toFixed(1)}
                        onChange={(e) => updateContent('logoY', Number(e.target.value))}
                        className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700">
                      Logo size: {content.logoSize.toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min={2}
                      max={30}
                      step={1}
                      value={content.logoSize}
                      onChange={(e) => updateContent('logoSize', Number(e.target.value))}
                      className="mt-1 w-full accent-brand-600"
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-gray-500">💡 Drag the logo on the preview to reposition</span>
                    <button
                      type="button"
                      onClick={() => updateContent('logoDataUrl', null)}
                      className="text-red-600 underline"
                    >
                      Remove
                    </button>
                  </div>
                </>
              )}
            </Field>
          </CollapsibleSection>
        )}

        {!isBuiltInTemplate && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
            💡 Tip: editable text fields are available when you pick one of the
            built-in templates in step 1.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Small helpers ----------

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="font-semibold text-gray-900">{title}</span>
        <span className="text-gray-400">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="space-y-4 border-t border-gray-200 px-5 py-4">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

export { PRESET_TEMPLATES };
