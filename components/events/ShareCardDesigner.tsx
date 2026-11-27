'use client';

import { useEffect, useRef, useState } from 'react';
import ShareCardMaker, { type ShareCardEvent } from '@/components/events/ShareCardMaker';
import { DEFAULT_ZONES, OUTPUT_SIZES, clampBox, clampCircle, type RelCircle } from '@/lib/shareCard/geometry';
import { drawShareCard } from '@/lib/shareCard/render';
import { logoColors } from '@/lib/shareCard/colors';
import { uploadEventImage } from '@/lib/eventMode/upload';
import type { CardLayout, ShareCardCustom, ShareCardSettings, TextZone } from '@/lib/eventMode/types';
import { tx, type Locale } from '@/lib/i18n';

const DEFAULT_TEXT: TextZone = { ...DEFAULT_ZONES.text, font: 'sans', color: '#111827', align: 'center' };

const DEFAULT_CUSTOM: ShareCardCustom = { layout: 'centered', showRole: true, showHashtag: true, showPartners: true };

const LAYOUTS: { id: CardLayout; en: string; es: string }[] = [
  { id: 'centered', en: 'Centered', es: 'Centrada' },
  { id: 'split', en: 'Photo left', es: 'Foto a la izquierda' },
  { id: 'hero', en: 'Big photo', es: 'Foto grande' },
  { id: 'minimal', en: 'No photo', es: 'Sin foto' },
];

/** Small live thumbnail of a layout with the current event data. */
function LayoutThumb({ event, custom, layout, sampleName, locale }: { event: ShareCardEvent; custom: ShareCardCustom; layout: CardLayout; sampleName: string; locale: Locale }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = OUTPUT_SIZES.portrait.w / 5;
    canvas.height = OUTPUT_SIZES.portrait.h / 5;
    drawShareCard(
      canvas,
      {
        headline: custom.headline?.toUpperCase() ?? tx(locale, { en: "I'M ATTENDING", es: 'VOY A ASISTIR' }),
        eventName: event.name,
        dateLine: event.dateLine,
        placeLine: event.placeLine ?? null,
        organizer: event.organizer,
        hashtag: custom.showHashtag ? event.hashtag : null,
        personName: sampleName,
        personTitle: null,
        accent: custom.accent ?? event.accent,
        style: event.style,
        footer: '',
        layout,
        tone: custom.tone,
      },
      {},
      null,
      null,
    );
  }, [event, custom, layout, sampleName, locale]);
  return <canvas ref={ref} className="w-full rounded border border-gray-200" style={{ aspectRatio: '1080 / 1350' }} />;
}

/**
 * Share card settings for the organizer. Level 0 needs nothing (preview
 * only). "Use my own design" (Level 2): upload a background and place the
 * photo circle and the name box by dragging; zones are stored relative to
 * the background.
 */
export default function ShareCardDesigner({
  locale,
  value,
  onChange,
  previewEvent,
  sampleName,
}: {
  locale: Locale;
  value: ShareCardSettings;
  onChange: (v: ShareCardSettings) => void;
  // Event data for the live preview (without the design; added here).
  previewEvent: ShareCardEvent;
  sampleName: string;
}) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ target: 'photo' | 'text'; startX: number; startY: number; orig: RelCircle | TextZone } | null>(null);

  const mode = value.level ?? 0;
  const ownDesign = mode === 2;
  const custom: ShareCardCustom = value.custom ?? DEFAULT_CUSTOM;
  const setCustom = (patch: Partial<ShareCardCustom>) => onChange({ level: 1, custom: { ...custom, ...patch } });
  const bg = value.background ?? null;

  // Colors suggested from the logo, plus the event's own color.
  const [swatches, setSwatches] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    const base = [previewEvent.accent];
    if (!previewEvent.logoUrl) {
      setSwatches(base);
      return;
    }
    logoColors(previewEvent.logoUrl)
      .then((colors) => {
        if (!cancelled) setSwatches(Array.from(new Set([...base, ...colors].map((c) => c.toLowerCase()))).slice(0, 6));
      })
      .catch(() => !cancelled && setSwatches(base));
    return () => {
      cancelled = true;
    };
  }, [previewEvent.logoUrl, previewEvent.accent]);
  const zones = value.zones ?? { photo: DEFAULT_ZONES.photo, text: DEFAULT_TEXT };

  async function onBackground(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const up = await uploadEventImage(file, 'background');
      onChange({ level: 2, background: { url: up.url, w: up.w, h: up.h }, zones: value.zones ?? { photo: DEFAULT_ZONES.photo, text: DEFAULT_TEXT } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Upload failed', 'No se pudo subir'));
    } finally {
      setUploading(false);
    }
  }

  function setZones(next: { photo: RelCircle; text: TextZone }) {
    onChange({ ...value, level: 2, zones: next });
  }

  function onPointerDown(target: 'photo' | 'text', e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { target, startX: e.clientX, startY: e.clientY, orig: target === 'photo' ? zones.photo : zones.text };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const area = areaRef.current?.getBoundingClientRect();
    if (!d || !area) return;
    const dx = (e.clientX - d.startX) / area.width;
    const dy = (e.clientY - d.startY) / area.height;
    if (d.target === 'photo') {
      const o = d.orig as RelCircle;
      setZones({ ...zones, photo: clampCircle({ ...o, cx: o.cx + dx, cy: o.cy + dy }) });
    } else {
      const o = d.orig as TextZone;
      setZones({ ...zones, text: { ...o, ...clampBox({ x: o.x + dx, y: o.y + dy, w: o.w, h: o.h }) } });
    }
  }

  const designEvent: ShareCardEvent =
    ownDesign && bg
      ? { ...previewEvent, design: { backgroundUrl: bg.url, bgSize: { w: bg.w, h: bg.h }, zones }, custom: null }
      : { ...previewEvent, design: null, custom: mode === 1 ? custom : null };

  const modeButton = (m: 0 | 1 | 2, label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 ${mode === m ? 'border-brand-600 bg-brand-50 font-medium text-brand-800' : 'border-gray-300 bg-white text-gray-700'}`}
    >
      {label}
    </button>
  );
  const toggle = (key: 'showRole' | 'showHashtag' | 'showPartners', label: string) => (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={custom[key]} onChange={(e) => setCustom({ [key]: e.target.checked })} className="h-4 w-4" />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
     <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {modeButton(0, t('Automatic', 'Automática'), () => onChange({ level: 0 }))}
        {modeButton(1, t('Customize', 'Personalizar'), () => onChange({ level: 1, custom }))}
        {modeButton(2, t('Use my own design', 'Usar mi propio diseño'), () => onChange({ ...value, level: 2 }))}
      </div>

      {mode === 0 && (
        <p className="text-sm text-gray-600">
          {t(
            'Made from your event: style, color, logo, date and place. Nothing to set up.',
            'Se arma sola con tu evento: estilo, color, logo, fecha y lugar. No hay que configurar nada.',
          )}
        </p>
      )}

      {mode === 1 && (
        <div className="space-y-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
          <div>
            <p className="font-medium text-gray-800">{t('Layout', 'Distribución')}</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setCustom({ layout: l.id })}
                  className={`rounded-lg border p-1 text-xs ${custom.layout === l.id ? 'border-brand-600 ring-2 ring-brand-200' : 'border-gray-200 bg-white'}`}
                >
                  <LayoutThumb event={previewEvent} custom={custom} layout={l.id} sampleName={sampleName} locale={locale} />
                  <span className="mt-1 block text-gray-700">{tx(locale, l)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-medium text-gray-800">{t('Color', 'Color')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {swatches.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCustom({ accent: c })}
                  title={c}
                  className={`h-8 w-8 rounded-full border-2 ${(custom.accent ?? previewEvent.accent).toLowerCase() === c ? 'border-gray-900' : 'border-white shadow'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input type="color" value={custom.accent ?? previewEvent.accent} onChange={(e) => setCustom({ accent: e.target.value })} className="h-8 w-10" />
                {t('Other', 'Otro')}
              </label>
            </div>
            {previewEvent.logoUrl && swatches.length > 1 && (
              <p className="mt-1 text-xs text-gray-500">{t('Suggested from your logo.', 'Sugeridos a partir de tu logo.')}</p>
            )}
          </div>

          <div>
            <p className="font-medium text-gray-800">{t('Background', 'Fondo')}</p>
            <div className="mt-2 flex gap-2">
              {[
                { v: undefined, label: t('Style default', 'Según el estilo') },
                { v: 'light' as const, label: t('Light', 'Claro') },
                { v: 'dark' as const, label: t('Dark', 'Oscuro') },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setCustom({ tone: o.v })}
                  className={`rounded-lg border px-3 py-1.5 ${custom.tone === o.v ? 'border-brand-600 bg-white font-medium text-brand-800' : 'border-gray-300 bg-white text-gray-700'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="font-medium text-gray-800">{t('Label', 'Etiqueta')}</span>
            <input
              value={custom.headline ?? ''}
              onChange={(e) => setCustom({ headline: e.target.value.slice(0, 28) || undefined })}
              maxLength={28}
              placeholder={t("I'M ATTENDING", 'VOY A ASISTIR')}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 uppercase"
            />
          </label>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-gray-700">
            {toggle('showRole', t('Ask for role or company', 'Pedir cargo o empresa'))}
            {toggle('showHashtag', t('Show hashtag', 'Mostrar hashtag'))}
            {toggle('showPartners', t('Show partner logos', 'Mostrar logos de socios'))}
          </div>
        </div>
      )}

      {ownDesign && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
          <label className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg border border-gray-300 bg-white px-3 py-1.5">
              {uploading ? t('Uploading…', 'Subiendo…') : bg ? t('Change background', 'Cambiar fondo') : t('Upload background', 'Subir fondo')}
            </span>
            <span className="text-xs text-gray-500">PNG/JPG · 1080×1350 {t('or', 'o')} 1200×1200</span>
            <input type="file" accept="image/png,image/jpeg" className="sr-only" disabled={uploading} onChange={(e) => onBackground(e.target.files?.[0])} />
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}

          {bg && (
            <>
              <p className="text-xs text-gray-600">
                {t('Drag the circle (photo) and the box (name and role) into place.', 'Arrastra el círculo (foto) y el recuadro (nombre y cargo) a su lugar.')}
              </p>
              <div
                ref={areaRef}
                onPointerMove={onPointerMove}
                onPointerUp={() => (drag.current = null)}
                className="relative mx-auto w-full max-w-[360px] touch-none select-none overflow-hidden rounded-lg border border-gray-300"
                style={{ aspectRatio: `${bg.w} / ${bg.h}`, backgroundImage: `url(${bg.url})`, backgroundSize: 'cover' }}
              >
                <div
                  onPointerDown={(e) => onPointerDown('photo', e)}
                  className="absolute cursor-move rounded-full border-2 border-dashed border-white bg-black/25 shadow"
                  style={{
                    left: `${(zones.photo.cx - zones.photo.r) * 100}%`,
                    top: `calc(${zones.photo.cy * 100}% - ${zones.photo.r * 100 * (bg.w / bg.h)}%)`,
                    width: `${zones.photo.r * 200}%`,
                    aspectRatio: '1',
                  }}
                  title={t('Photo', 'Foto')}
                />
                <div
                  onPointerDown={(e) => onPointerDown('text', e)}
                  className="absolute flex cursor-move items-center justify-center border-2 border-dashed border-white bg-black/25 text-[10px] font-semibold text-white shadow"
                  style={{ left: `${zones.text.x * 100}%`, top: `${zones.text.y * 100}%`, width: `${zones.text.w * 100}%`, height: `${zones.text.h * 100}%` }}
                >
                  {t('Name + role', 'Nombre + cargo')}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-gray-600">{t('Photo size', 'Tamaño de la foto')}</span>
                  <input type="range" min={0.05} max={0.45} step={0.005} value={zones.photo.r} onChange={(e) => setZones({ ...zones, photo: clampCircle({ ...zones.photo, r: Number(e.target.value) }) })} className="block w-full" />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600">{t('Text box width', 'Ancho del texto')}</span>
                  <input type="range" min={0.2} max={1} step={0.01} value={zones.text.w} onChange={(e) => setZones({ ...zones, text: { ...zones.text, ...clampBox({ ...zones.text, w: Number(e.target.value) }) } })} className="block w-full" />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600">{t('Text size', 'Tamaño del texto')}</span>
                  <input type="range" min={0.05} max={0.3} step={0.005} value={zones.text.h} onChange={(e) => setZones({ ...zones, text: { ...zones.text, ...clampBox({ ...zones.text, h: Number(e.target.value) }) } })} className="block w-full" />
                </label>
                <div className="flex items-end gap-3">
                  <label className="block">
                    <span className="text-xs text-gray-600">{t('Color', 'Color')}</span>
                    <input type="color" value={zones.text.color} onChange={(e) => setZones({ ...zones, text: { ...zones.text, color: e.target.value } })} className="block h-8 w-12" />
                  </label>
                  <select value={zones.text.font} onChange={(e) => setZones({ ...zones, text: { ...zones.text, font: e.target.value === 'serif' ? 'serif' : 'sans' } })} className="rounded border border-gray-300 px-2 py-1 text-xs">
                    <option value="sans">Sans</option>
                    <option value="serif">Serif</option>
                  </select>
                  <select value={zones.text.align} onChange={(e) => setZones({ ...zones, text: { ...zones.text, align: e.target.value as TextZone['align'] } })} className="rounded border border-gray-300 px-2 py-1 text-xs">
                    <option value="left">{t('Left', 'Izquierda')}</option>
                    <option value="center">{t('Center', 'Centro')}</option>
                    <option value="right">{t('Right', 'Derecha')}</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      )}
     </div>

      {/* Preview stays in view while editing. */}
      <div className="md:sticky md:top-4 md:self-start">
        <ShareCardMaker locale={locale} phase="before" event={designEvent} defaultName={sampleName} defaultPostText="" compact />
      </div>
    </div>
  );
}
