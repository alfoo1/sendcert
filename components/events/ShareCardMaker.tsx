'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OUTPUT_SIZES, type OutputFormat } from '@/lib/shareCard/geometry';
import {
  drawShareCard,
  loadImage,
  photoCircle,
  renderShareCardBlob,
  type CardContent,
  type CardImages,
  type CardPhoto,
  type CustomDesign,
} from '@/lib/shareCard/render';
import { linkedInComposeUrl } from '@/lib/eventMode/format';
import { tx, type Locale } from '@/lib/i18n';

export type ShareCardEvent = {
  name: string;
  dateLine: string | null;
  organizer: string | null;
  hashtag: string | null;
  accent: string;
  style: string;
  logoUrl: string | null;
  partnerLogoUrls: string[];
  design: { backgroundUrl: string; bgSize: { w: number; h: number }; zones: CustomDesign['zones'] } | null;
};

/**
 * "I'm attending" / "I attended" card for the person's LinkedIn. Drawn in the
 * browser: the optional photo is read from the device and never uploaded.
 */
export default function ShareCardMaker({
  locale,
  phase,
  event,
  defaultName,
  defaultPostText,
  compact = false,
}: {
  locale: Locale;
  phase: 'before' | 'after';
  event: ShareCardEvent;
  defaultName: string;
  defaultPostText: string;
  // Organizer previews: no downloads or post text.
  compact?: boolean;
}) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<OutputFormat>('portrait');
  const [name, setName] = useState(defaultName);
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<CardImages>({});
  const [photo, setPhoto] = useState<CardPhoto | null>(null);
  const [postText, setPostText] = useState(defaultPostText);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => setName(defaultName), [defaultName]);
  useEffect(() => setPostText(defaultPostText), [defaultPostText]);

  // Event images (logo, partners, own background). Failures are skipped.
  const partnerKey = event.partnerLogoUrls.join('|');
  useEffect(() => {
    let cancelled = false;
    const safe = (url: string | null | undefined) => (url ? loadImage(url).catch(() => null) : Promise.resolve(null));
    Promise.all([safe(event.logoUrl), Promise.all(event.partnerLogoUrls.map(safe)), safe(event.design?.backgroundUrl)]).then(
      ([logo, partners, background]) => {
        if (!cancelled) setImages({ logo, partners: partners.filter((p): p is HTMLImageElement => p !== null), background });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [event.logoUrl, partnerKey, event.design?.backgroundUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const probe = new File([new Blob()], 'x.png', { type: 'image/png' });
      setCanShareFiles(typeof navigator !== 'undefined' && Boolean(navigator.canShare?.({ files: [probe] })));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  const design: CustomDesign | null = useMemo(
    () => (event.design ? { bgSize: event.design.bgSize, zones: event.design.zones } : null),
    [event.design],
  );

  const content: CardContent = useMemo(
    () => ({
      headline:
        phase === 'before' ? t("I'M ATTENDING", 'VOY A ASISTIR') : t('I ATTENDED', 'ASISTÍ'),
      eventName: event.name,
      dateLine: event.dateLine,
      organizer: event.organizer,
      hashtag: event.hashtag,
      personName: name.trim() || t('Your name', 'Tu nombre'),
      personTitle: title.trim() || null,
      accent: event.accent,
      style: event.style,
      footer: 'sendcert.org',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, event, name, title, locale],
  );

  const size = OUTPUT_SIZES[format];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size.w;
    canvas.height = size.h;
    drawShareCard(canvas, content, images, photo, design);
  }, [content, images, photo, design, size]);

  function onPhotoFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    loadImage(url)
      .then((image) => setPhoto({ image, offsetX: 0, offsetY: 0, zoom: 1 }))
      .catch(() => {});
  }

  // Drag the photo inside its circle (pointer coordinates → canvas pixels).
  const toCanvas = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      return { x: ((e.clientX - rect.left) / rect.width) * size.w, y: ((e.clientY - rect.top) / rect.height) * size.h };
    },
    [size],
  );

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!photo) return;
    const p = toCanvas(e);
    const c = photoCircle(size, design);
    if (Math.hypot(p.x - c.cx, p.y - c.cy) > c.r) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: p.x, y: p.y, ox: photo.offsetX, oy: photo.offsetY };
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drag.current || !photo) return;
    const p = toCanvas(e);
    const { r } = photoCircle(size, design);
    const limit = photo.zoom;
    setPhoto({
      ...photo,
      offsetX: Math.max(-limit, Math.min(limit, drag.current.ox + (p.x - drag.current.x) / r)),
      offsetY: Math.max(-limit, Math.min(limit, drag.current.oy + (p.y - drag.current.y) / r)),
    });
  }

  const fileBase = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'event'}-${
    phase === 'before' ? 'attending' : 'attended'
  }`;

  async function download(f: OutputFormat) {
    setBusy(true);
    try {
      const blob = await renderShareCardBlob(OUTPUT_SIZES[f], content, images, photo, design);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileBase}-${OUTPUT_SIZES[f].w}x${OUTPUT_SIZES[f].h}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setBusy(false);
    }
  }

  async function shareImage() {
    setBusy(true);
    try {
      const blob = await renderShareCardBlob(OUTPUT_SIZES.portrait, content, images, photo, design);
      if (!blob) return;
      const file = new File([blob], `${fileBase}.png`, { type: 'image/png' });
      await navigator.share({ files: [file], text: postText });
    } catch {
      // Cancelled or not supported: downloads remain available.
    } finally {
      setBusy(false);
    }
  }

  function copyText() {
    navigator.clipboard?.writeText(postText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={compact ? '' : 'grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}>
      <div>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          className={`w-full rounded-xl border border-gray-200 shadow-sm ${photo ? 'cursor-grab touch-none' : ''}`}
          style={{ aspectRatio: `${size.w} / ${size.h}` }}
          aria-label={t('Share card preview', 'Vista previa de la tarjeta')}
        />
        <div className="mt-2 flex justify-center gap-2 text-xs">
          {(['portrait', 'square'] as OutputFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`rounded-full px-3 py-1 ${format === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {f === 'portrait' ? '1080 × 1350' : '1200 × 1200'}
            </button>
          ))}
        </div>
      </div>

      {!compact && (
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">{t('Name on the card', 'Nombre en la tarjeta')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">
              {t('Role or company', 'Cargo o empresa')} <span className="font-normal text-gray-400">{t('(optional)', '(opcional)')}</span>
            </span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>

          <div className="rounded-lg border border-gray-200 p-3 text-sm">
            {photo ? (
              <div className="space-y-2">
                <label className="block">
                  <span className="text-gray-700">{t('Zoom', 'Zoom')}</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={photo.zoom}
                    onChange={(e) => setPhoto({ ...photo, zoom: Number(e.target.value) })}
                    className="mt-1 block w-full"
                  />
                </label>
                <p className="text-xs text-gray-500">{t('Drag the photo on the card to adjust it.', 'Arrastra la foto en la tarjeta para acomodarla.')}</p>
                <button type="button" onClick={() => setPhoto(null)} className="text-xs text-gray-600 underline">
                  {t('Remove photo', 'Quitar foto')}
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="font-medium text-gray-700">{t('Add your photo', 'Agrega tu foto')}</span>
                <span className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs">{t('Choose…', 'Elegir…')}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhotoFile(e.target.files?.[0])} />
              </label>
            )}
            <p className="mt-2 text-xs text-gray-500">
              🔒 {t('Your photo stays on this device. It is never uploaded.', 'Tu foto se queda en este dispositivo. Nunca se sube.')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canShareFiles && (
              <button type="button" disabled={busy} onClick={shareImage} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {t('Share image…', 'Compartir imagen…')}
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => download('portrait')} className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${canShareFiles ? 'border border-gray-300 bg-white text-gray-800' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
              {t('Download image', 'Descargar imagen')} (1080×1350)
            </button>
            <button type="button" disabled={busy} onClick={() => download('square')} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-50">
              1200×1200
            </button>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-gray-700">{t('Post text', 'Texto para publicar')}</span>
            <textarea value={postText} onChange={(e) => setPostText(e.target.value)} rows={5} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyText} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800">
              {copied ? t('Copied ✓', 'Copiado ✓') : t('Copy post text', 'Copiar texto')}
            </button>
            <a href={linkedInComposeUrl(postText)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004182]">
              {t('Open LinkedIn', 'Abrir LinkedIn')}
            </a>
          </div>
          <p className="text-xs text-gray-500">
            {t(
              'LinkedIn doesn’t let sites attach images: download the image and attach it to your post.',
              'LinkedIn no permite que un sitio adjunte imágenes: descarga la imagen y adjúntala a tu publicación.',
            )}
            {event.organizer
              ? ` ${t(`To tag ${event.organizer}, type @ and pick them from the list.`, `Para etiquetar a ${event.organizer}, escribe @ y elígelo de la lista.`)}`
              : ''}
          </p>
        </div>
      )}
    </div>
  );
}
