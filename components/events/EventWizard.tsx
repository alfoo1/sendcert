'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import StudentsStep, { type Recipient } from '@/components/StudentsStep';
import ShareCardDesigner from '@/components/events/ShareCardDesigner';
import ShareCardMaker, { type ShareCardEvent } from '@/components/events/ShareCardMaker';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { trackEvent } from '@/components/Analytics';
import { loadDraft } from '@/lib/draft';
import { PRESET_TEMPLATES, presetName } from '@/lib/templates';
import { isValidEmail } from '@/lib/validation';
import { defaultPostText, formatEventDate, formatEventTime, hashtagText } from '@/lib/eventMode/format';
import { uploadEventImage } from '@/lib/eventMode/upload';
import { eventDashboardPath } from '@/lib/eventMode/links';
import { inviteText } from '@/lib/eventMode/invite';
import type { EventRecord, PartnerLogo, ShareCardSettings } from '@/lib/eventMode/types';
import { localizePath, tx, type Locale } from '@/lib/i18n';

type Details = {
  name: string;
  eventDate: string;
  eventTime: string;
  timezone: string;
  venue: string;
  address: string;
  organizerName: string;
  logoUrl: string | null;
  accentColor: string;
  hashtag: string;
  eventUrl: string;
  partnerLogos: PartnerLogo[];
  style: string;
  replyTo: string;
  shareCard: ShareCardSettings;
};

const PLACEHOLDER_INSTITUTIONS = ['Example Academy', 'Academia Ejemplo'];
const STEPS = ['details', 'people', 'preview'] as const;

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function allTimeZones(current: string): string[] {
  const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
  return list.includes(current) ? list : [current, ...list];
}

/** As an EventRecord, for formatting helpers and previews. */
function asRecord(d: Details, locale: Locale): EventRecord {
  return {
    id: 'preview',
    ownerId: '',
    createdAt: '',
    locale,
    name: d.name || (locale === 'es' ? 'Tu evento' : 'Your event'),
    eventDate: d.eventDate || null,
    eventTime: d.eventTime || null,
    timezone: d.timezone,
    venue: d.venue || null,
    address: d.address || null,
    organizerName: d.organizerName || null,
    logoUrl: d.logoUrl,
    accentColor: d.accentColor,
    hashtag: d.hashtag || null,
    eventUrl: d.eventUrl || null,
    partnerLogos: d.partnerLogos,
    style: d.style,
    replyTo: d.replyTo || null,
    inviteSubject: null,
    inviteBody: null,
    shareCard: d.shareCard,
  };
}

/** "Send a pre-event invite": event details → people → preview → links. */
export default function EventWizard({ locale, ownerEmail }: { locale: Locale; ownerEmail: string | null }) {
  return (
    <LocaleProvider locale={locale}>
      <Wizard locale={locale} ownerEmail={ownerEmail} />
    </LocaleProvider>
  );
}

function Wizard({ locale, ownerEmail }: { locale: Locale; ownerEmail: string | null }) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<Details>(() => ({
    name: '',
    eventDate: '',
    eventTime: '',
    timezone: 'UTC',
    venue: '',
    address: '',
    organizerName: '',
    logoUrl: null,
    accentColor: '#1e3a5f',
    hashtag: '',
    eventUrl: '',
    partnerLogos: [],
    style: 'elegant',
    replyTo: ownerEmail ?? '',
    shareCard: { level: 0 },
  }));
  const [moreOpen, setMoreOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; added: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof Details>(key: K, value: Details[K]) => setDetails((d) => ({ ...d, [key]: value }));

  // Reuse what the certificate design already has: organizer, logo, color, style.
  useEffect(() => {
    set('timezone', browserTimeZone());
    loadDraft(locale).then((draft) => {
      const content = draft?.content as { institutionName?: string; accentColor?: string; logoDataUrl?: string | null } | null;
      if (!draft) return;
      setDetails((d) => ({
        ...d,
        organizerName:
          d.organizerName || (content?.institutionName && !PLACEHOLDER_INSTITUTIONS.includes(content.institutionName) ? content.institutionName : ''),
        accentColor: content?.accentColor ?? d.accentColor,
        logoUrl: d.logoUrl ?? content?.logoDataUrl ?? null,
        style: draft.templateId && PRESET_TEMPLATES.some((p) => p.id === draft.templateId) ? draft.templateId : d.style,
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const record = useMemo(() => asRecord(details, locale), [details, locale]);
  const previewCard: ShareCardEvent = useMemo(
    () => ({
      name: record.name,
      dateLine: [formatEventDate(record, locale, 'short'), record.venue].filter(Boolean).join(' · ') || null,
      organizer: record.organizerName,
      hashtag: hashtagText(record.hashtag),
      accent: record.accentColor,
      style: record.style,
      logoUrl: record.logoUrl,
      partnerLogoUrls: record.partnerLogos.map((p) => p.url),
      design:
        details.shareCard.level === 2 && details.shareCard.background && details.shareCard.zones
          ? {
              backgroundUrl: details.shareCard.background.url,
              bgSize: { w: details.shareCard.background.w, h: details.shareCard.background.h },
              zones: details.shareCard.zones,
            }
          : null,
    }),
    [record, details.shareCard, locale],
  );

  const validPeople = recipients.filter((r) => r.name.trim() && isValidEmail(r.email));
  const sampleName = validPeople[0]?.name ?? (locale === 'es' ? 'Ana Pérez' : 'Jane Doe');
  const invite = inviteText(record, locale);

  async function onImage(kind: 'logo' | 'partner', file: File | undefined) {
    if (!file) return;
    setUploading(kind);
    setError(null);
    try {
      const up = await uploadEventImage(file, kind);
      if (kind === 'logo') set('logoUrl', up.url);
      else set('partnerLogos', [...details.partnerLogos, { url: up.url }].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Upload failed', 'No se pudo subir'));
    } finally {
      setUploading(null);
    }
  }

  const canNext =
    step === 0 ? details.name.trim().length > 0 && (!details.replyTo || isValidEmail(details.replyTo)) : step === 1 ? validPeople.length > 0 : true;

  async function create() {
    setSaving(true);
    setError(null);
    try {
      // A logo reused from the certificate design is still a data URL: upload it.
      let logoUrl = details.logoUrl;
      if (logoUrl?.startsWith('data:')) {
        try {
          logoUrl = (await uploadEventImage(logoUrl, 'logo')).url;
        } catch {
          logoUrl = null;
        }
      }
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, logoUrl, locale, recipients: validPeople }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t('Could not create the event.', 'No se pudo crear el evento.'));
        return;
      }
      trackEvent('event_created', { recipients: data.added });
      setCreated({ id: data.id, added: data.added });
    } catch {
      setError(t('Network error. Please try again.', 'Error de conexión. Inténtalo de nuevo.'));
    } finally {
      setSaving(false);
    }
  }

  function copyInvite() {
    navigator.clipboard?.writeText(`${invite.subject}\n\n${invite.body}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const input = 'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
  const labels = [t('Event details', 'Datos del evento'), t('People', 'Personas'), t('Preview', 'Vista previa')];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <Link href={localizePath('/', locale)} className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">S</span>
            SendCert
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <LanguageSwitcher locale={locale} enPath="/events/new" />
            <Link href={localizePath('/dashboard', locale)} className="text-gray-600 hover:text-gray-900">
              {t('My sends', 'Mis envíos')}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">{t('Send a pre-event invite', 'Enviar una invitación previa al evento')}</h1>
        <p className="mt-1 text-gray-600">
          {t('Boost attendance and get people sharing before your event.', 'Aumenta la asistencia y logra que compartan antes de tu evento.')}
        </p>

        {created ? (
          <section className="mt-8 rounded-2xl border border-green-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">{t('Your event is ready 🎉', 'Tu evento está listo 🎉')}</h2>
            <p className="mt-1 text-gray-600">
              {t(
                `${created.added} people have their own personal link to answer and get their share card.`,
                `${created.added} personas tienen su enlace personal para responder y armar su tarjeta.`,
              )}
            </p>
            <ol className="mt-5 space-y-4 text-sm text-gray-700">
              <li>
                <p className="font-medium text-gray-900">1. {t('Download the personal links', 'Descarga los enlaces personales')}</p>
                <a href={`/api/events/${created.id}/export?type=links`} className="mt-2 inline-block rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">
                  {t('Download links (CSV)', 'Descargar enlaces (CSV)')}
                </a>
              </li>
              <li>
                <p className="font-medium text-gray-900">2. {t('Send the invitation from your own email', 'Envía la invitación desde tu correo')}</p>
                <p className="mt-1 text-gray-600">
                  {t(
                    'Use a mail merge (Gmail, Outlook…) with the CSV: {{name}} is the Name column and {{link}} the Personal link column.',
                    'Usa combinación de correspondencia (Gmail, Outlook…) con el CSV: {{name}} es la columna Nombre y {{link}} la columna Enlace personal.',
                  )}
                </p>
                <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800">{`${invite.subject}\n\n${invite.body}`}</pre>
                <button type="button" onClick={copyInvite} className="mt-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium">
                  {copied ? t('Copied ✓', 'Copiado ✓') : t('Copy invitation text', 'Copiar texto de la invitación')}
                </button>
              </li>
              <li>
                <p className="font-medium text-gray-900">3. {t('Follow the answers', 'Sigue las respuestas')}</p>
                <Link href={eventDashboardPath(locale, created.id)} className="mt-2 inline-block rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800">
                  {t('Open the event dashboard →', 'Abrir el panel del evento →')}
                </Link>
              </li>
            </ol>
          </section>
        ) : (
          <>
            <ol className="mt-6 flex gap-2 text-sm">
              {labels.map((label, i) => (
                <li key={label} className={`rounded-full px-3 py-1 ${i === step ? 'bg-brand-600 text-white' : i < step ? 'bg-brand-100 text-brand-800' : 'bg-gray-200 text-gray-600'}`}>
                  {i + 1}. {label}
                </li>
              ))}
            </ol>

            <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              {STEPS[step] === 'details' && (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm sm:col-span-2">
                      <span className="font-medium text-gray-700">{t('Event name', 'Nombre del evento')} *</span>
                      <input value={details.name} onChange={(e) => set('name', e.target.value)} maxLength={150} className={input} placeholder="GovCon 360" />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium text-gray-700">{t('Date', 'Fecha')}</span>
                      <input type="date" value={details.eventDate} onChange={(e) => set('eventDate', e.target.value)} className={input} />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium text-gray-700">{t('Time', 'Hora')}</span>
                      <input type="time" value={details.eventTime} onChange={(e) => set('eventTime', e.target.value)} className={input} />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium text-gray-700">{t('Venue', 'Lugar')}</span>
                      <input value={details.venue} onChange={(e) => set('venue', e.target.value)} maxLength={150} className={input} />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium text-gray-700">{t('Organizer', 'Organizador')}</span>
                      <input value={details.organizerName} onChange={(e) => set('organizerName', e.target.value)} maxLength={120} className={input} />
                    </label>
                  </div>

                  <div className="rounded-lg border border-gray-200">
                    <button type="button" onClick={() => setMoreOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-800">
                      <span>{t('More details (address, time zone, logo, color, links…)', 'Más datos (dirección, zona horaria, logo, color, enlaces…)')}</span>
                      <span className="text-gray-400">{moreOpen ? '−' : '+'}</span>
                    </button>
                    {moreOpen && (
                      <div className="grid gap-4 border-t border-gray-200 p-4 sm:grid-cols-2">
                        <label className="block text-sm sm:col-span-2">
                          <span className="text-gray-700">{t('Address', 'Dirección')}</span>
                          <input value={details.address} onChange={(e) => set('address', e.target.value)} maxLength={250} className={input} />
                        </label>
                        <label className="block text-sm">
                          <span className="text-gray-700">{t('Time zone', 'Zona horaria')}</span>
                          <select value={details.timezone} onChange={(e) => set('timezone', e.target.value)} className={input}>
                            {allTimeZones(details.timezone).map((z) => (
                              <option key={z} value={z}>
                                {z.replace(/_/g, ' ')}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm">
                          <span className="text-gray-700">{t('Event website', 'Sitio del evento')}</span>
                          <input value={details.eventUrl} onChange={(e) => set('eventUrl', e.target.value)} maxLength={300} className={input} placeholder="https://" />
                        </label>
                        <label className="block text-sm">
                          <span className="text-gray-700">Hashtag</span>
                          <input value={details.hashtag} onChange={(e) => set('hashtag', e.target.value)} maxLength={60} className={input} placeholder="#GovCon360" />
                        </label>
                        <label className="block text-sm">
                          <span className="text-gray-700">{t('Replies go to', 'Las respuestas van a')}</span>
                          <input type="email" value={details.replyTo} onChange={(e) => set('replyTo', e.target.value)} maxLength={254} className={input} />
                          {details.replyTo && !isValidEmail(details.replyTo) && (
                            <span className="mt-1 block text-xs text-red-600">{t('Enter a valid email or leave it empty.', 'Escribe un correo válido o déjalo vacío.')}</span>
                          )}
                        </label>
                        <label className="block text-sm">
                          <span className="text-gray-700">{t('Style', 'Estilo')}</span>
                          <select value={details.style} onChange={(e) => set('style', e.target.value)} className={input}>
                            {PRESET_TEMPLATES.map((p) => (
                              <option key={p.id} value={p.id}>
                                {presetName(p.id, locale)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm">
                          <span className="text-gray-700">{t('Accent color', 'Color principal')}</span>
                          <input type="color" value={details.accentColor} onChange={(e) => set('accentColor', e.target.value)} className="mt-1 block h-10 w-16 rounded border border-gray-300" />
                        </label>
                        <div className="text-sm sm:col-span-2">
                          <span className="text-gray-700">{t('Logo', 'Logo')}</span>
                          <div className="mt-1 flex items-center gap-3">
                            {details.logoUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={details.logoUrl} alt="" className="h-10 max-w-[120px] object-contain" />
                            )}
                            <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5">
                              {uploading === 'logo' ? t('Uploading…', 'Subiendo…') : details.logoUrl ? t('Change', 'Cambiar') : t('Upload', 'Subir')}
                              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onImage('logo', e.target.files?.[0])} />
                            </label>
                            {details.logoUrl && (
                              <button type="button" onClick={() => set('logoUrl', null)} className="text-xs text-gray-500 underline">
                                {t('Remove', 'Quitar')}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-sm sm:col-span-2">
                          <span className="text-gray-700">
                            {t('Partner logos', 'Logos de socios')} <span className="text-gray-400">({details.partnerLogos.length}/6)</span>
                          </span>
                          <div className="mt-1 flex flex-wrap items-center gap-3">
                            {details.partnerLogos.map((p, i) => (
                              <span key={p.url} className="flex items-center gap-1">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.url} alt="" className="h-8 max-w-[90px] object-contain" />
                                <button type="button" onClick={() => set('partnerLogos', details.partnerLogos.filter((_, j) => j !== i))} className="text-xs text-gray-400">
                                  ×
                                </button>
                              </span>
                            ))}
                            {details.partnerLogos.length < 6 && (
                              <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5">
                                {uploading === 'partner' ? t('Uploading…', 'Subiendo…') : t('Add', 'Agregar')}
                                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onImage('partner', e.target.files?.[0])} />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200">
                    <button type="button" onClick={() => setCardOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-800">
                      <span>
                        {t('Share card', 'Tarjeta para compartir')}{' '}
                        <span className="font-normal text-gray-500">
                          · {details.shareCard.level === 2 ? t('your design', 'tu diseño') : t('automatic', 'automática')}
                        </span>
                      </span>
                      <span className="text-gray-400">{cardOpen ? '−' : '+'}</span>
                    </button>
                    {cardOpen && (
                      <div className="border-t border-gray-200 p-4">
                        <ShareCardDesigner locale={locale} value={details.shareCard} onChange={(v) => set('shareCard', v)} previewEvent={{ ...previewCard, design: null }} sampleName={sampleName} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {STEPS[step] === 'people' && <StudentsStep recipients={recipients} onRecipientsChange={setRecipients} />}

              {STEPS[step] === 'preview' && (
                <div className="grid gap-8 md:grid-cols-2">
                  <div>
                    <h2 className="font-semibold text-gray-900">{t('What each person sees', 'Lo que ve cada persona')}</h2>
                    <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: details.accentColor }}>
                        {details.organizerName}
                      </p>
                      <p className="mt-2 text-xl font-bold text-gray-900">{record.name}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        {[formatEventDate(record, locale), formatEventTime(record, locale)].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-sm text-gray-600">{[record.venue, record.address].filter(Boolean).join(', ')}</p>
                      <p className="mt-4 text-sm font-medium text-gray-900">
                        {t(`${sampleName.split(' ')[0]}, will you be there?`, `${sampleName.split(' ')[0]}, ¿vas a ir?`)}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <span className="rounded-lg bg-brand-600 py-2 font-semibold text-white">{t("I'll be there", 'Voy')}</span>
                        <span className="rounded-lg border border-gray-300 bg-white py-2 font-semibold text-gray-800">{t("I can't make it", 'No puedo ir')}</span>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-gray-600">
                      {t(
                        `${validPeople.length} people will get a personal link. After “I'll be there” they can make this card:`,
                        `${validPeople.length} personas van a recibir un enlace personal. Después de “Voy” pueden armar esta tarjeta:`,
                      )}
                    </p>
                  </div>
                  <div className="mx-auto w-full max-w-[320px]">
                    <ShareCardMaker locale={locale} phase="before" event={previewCard} defaultName={sampleName} defaultPostText={defaultPostText(record, locale, 'before')} compact />
                  </div>
                </div>
              )}
            </section>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            {step === 0 && !details.name.trim() && (
              <p className="mt-3 text-right text-xs text-gray-500">{t('Add the event name to continue.', 'Escribe el nombre del evento para continuar.')}</p>
            )}
            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50">
                ← {t('Back', 'Atrás')}
              </button>
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                  {t('Next', 'Siguiente')} →
                </button>
              ) : (
                <button type="button" onClick={create} disabled={saving || validPeople.length === 0} className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                  {saving ? t('Creating…', 'Creando…') : t('Create event and get links', 'Crear evento y obtener enlaces')}
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
