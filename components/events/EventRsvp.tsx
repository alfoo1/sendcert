'use client';

import { useState } from 'react';
import ShareCardMaker, { type ShareCardEvent } from '@/components/events/ShareCardMaker';
import { tx, type Locale } from '@/lib/i18n';
import type { Rsvp } from '@/lib/eventMode/logic';

/** "I'll be there" / "I can't make it" on the personal page, then the share card. */
export default function EventRsvp({
  token,
  locale,
  initialRsvp,
  initialReason,
  firstName,
  fullName,
  googleCalendarUrl,
  hasDate,
  card,
  postText,
}: {
  token: string;
  locale: Locale;
  initialRsvp: Rsvp;
  initialReason: string | null;
  firstName: string;
  fullName: string;
  googleCalendarUrl: string | null;
  hasDate: boolean;
  card: ShareCardEvent;
  postText: string;
}) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  const [rsvp, setRsvp] = useState<Rsvp>(initialRsvp);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState(initialReason ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(value: 'yes' | 'no') {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/e/${token}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: value, reason: value === 'no' ? reason : undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t('Something went wrong. Please try again.', 'Algo salió mal. Inténtalo de nuevo.'));
        return;
      }
      setRsvp(value);
      setDeclining(false);
    } catch {
      setError(t('Network error. Please try again.', 'Error de conexión. Inténtalo de nuevo.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {rsvp === 'pending' && !declining && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{t(`${firstName}, will you be there?`, `${firstName}, ¿vas a ir?`)}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" disabled={saving} onClick={() => answer('yes')} className="rounded-xl bg-brand-600 px-5 py-3.5 text-base font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {t("I'll be there", 'Voy')}
            </button>
            <button type="button" disabled={saving} onClick={() => setDeclining(true)} className="rounded-xl border border-gray-300 bg-white px-5 py-3.5 text-base font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50">
              {t("I can't make it", 'No puedo ir')}
            </button>
          </div>
        </section>
      )}

      {declining && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{t('Sorry you can’t make it', 'Lástima que no puedas ir')}</h2>
          <label className="mt-3 block text-sm">
            <span className="text-gray-700">
              {t('Want to tell the organizer why?', '¿Quieres contarle al organizador por qué?')}{' '}
              <span className="text-gray-400">{t('(optional)', '(opcional)')}</span>
            </span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" disabled={saving} onClick={() => answer('no')} className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {t('Send answer', 'Enviar respuesta')}
            </button>
            <button type="button" onClick={() => setDeclining(false)} className="text-sm text-gray-600 underline">
              {t('Back', 'Volver')}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {t('This only tells the organizer you won’t attend. It doesn’t unsubscribe you from emails.', 'Esto solo le avisa al organizador que no vas a ir. No te da de baja de los correos.')}
          </p>
        </section>
      )}

      {rsvp === 'no' && !declining && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="font-medium text-gray-900">{t('Thanks for letting us know.', 'Gracias por avisar.')}</p>
          <p className="mt-1 text-sm text-gray-600">{t('We told the organizer you can’t make it.', 'Le avisamos al organizador que no puedes ir.')}</p>
          <button type="button" disabled={saving} onClick={() => answer('yes')} className="mt-3 text-sm font-medium text-brand-700 underline">
            {t('Changed your mind? I’ll be there', '¿Cambiaste de idea? Voy a ir')}
          </button>
        </section>
      )}

      {rsvp === 'yes' && (
        <>
          <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="text-lg font-semibold text-green-900">{t('See you there! 🎉', '¡Nos vemos ahí! 🎉')}</p>
            {hasDate && (
              <div className="mt-3 flex flex-wrap gap-2">
                {googleCalendarUrl && (
                  <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-900">
                    {t('Add to Google Calendar', 'Agregar a Google Calendar')}
                  </a>
                )}
                <a href={`/api/e/${token}/calendar`} className="rounded-lg border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-900">
                  {t('Apple / Outlook calendar', 'Calendario Apple / Outlook')}
                </a>
              </div>
            )}
            <button type="button" disabled={saving} onClick={() => setDeclining(true)} className="mt-3 text-xs text-green-900 underline">
              {t("Can't make it anymore?", '¿Ya no puedes ir?')}
            </button>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">{t('Tell your network you’re going', 'Cuéntale a tu red que vas')}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {t('Make your card, download it and post it on LinkedIn.', 'Arma tu tarjeta, descárgala y publícala en LinkedIn.')}
            </p>
            <div className="mt-4">
              <ShareCardMaker locale={locale} phase="before" event={card} defaultName={fullName} defaultPostText={postText} />
            </div>
          </section>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
