'use client';

import { useRef, useState } from 'react';
import ShareCardMaker, { type ShareCardEvent } from '@/components/events/ShareCardMaker';
import { DEFAULT_ZONES, clampBox, clampCircle, type RelCircle } from '@/lib/shareCard/geometry';
import { uploadEventImage } from '@/lib/eventMode/upload';
import type { ShareCardSettings, TextZone } from '@/lib/eventMode/types';
import { tx, type Locale } from '@/lib/i18n';

const DEFAULT_TEXT: TextZone = { ...DEFAULT_ZONES.text, font: 'sans', color: '#111827', align: 'center' };

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

  const custom = value.level === 2;
  const bg = value.background ?? null;
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
    custom && bg ? { ...previewEvent, design: { backgroundUrl: bg.url, bgSize: { w: bg.w, h: bg.h }, zones } } : { ...previewEvent, design: null };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={() => onChange({ level: 0 })}
          className={`rounded-lg border px-3 py-1.5 ${!custom ? 'border-brand-600 bg-brand-50 font-medium text-brand-800' : 'border-gray-300 bg-white text-gray-700'}`}
        >
          {t('Automatic (matches your style)', 'Automática (según tu estilo)')}
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, level: 2 })}
          className={`rounded-lg border px-3 py-1.5 ${custom ? 'border-brand-600 bg-brand-50 font-medium text-brand-800' : 'border-gray-300 bg-white text-gray-700'}`}
        >
          {t('Use my own design', 'Usar mi propio diseño')}
        </button>
      </div>

      {custom && (
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

      <div className="mx-auto max-w-[320px]">
        <ShareCardMaker locale={locale} phase="before" event={designEvent} defaultName={sampleName} defaultPostText="" compact />
      </div>
    </div>
  );
}
