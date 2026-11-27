'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { tx, type Locale } from '@/lib/i18n';

type Plan = {
  pending: number;
  invited: number;
  unsubscribed: number;
  remainingToday: number;
  monthlyRemaining: number;
  now: number;
  later: number;
  subject: string;
  body: string;
};

/**
 * "Send invitations by email" through SendCert (optional; the default for
 * some events is exporting links). Says up front how many go out
 * today and how many wait for tomorrow; clicking again resumes.
 */
export default function InvitePanel({ locale, eventId }: { locale: Locale; eventId: string }) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/invites`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Plan | null) => {
        if (!data) return;
        setPlan(data);
        setSubject(data.subject);
        setBody(data.body);
      })
      .catch(() => {});
  }, [eventId]);

  async function send() {
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/events/${eventId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t('Could not send the invitations.', 'No se pudieron enviar las invitaciones.'));
        return;
      }
      setPlan((p) => (p ? { ...p, ...data } : p));
      const parts = [t(`Sent ${data.sent}.`, `Se enviaron ${data.sent}.`)];
      if (data.failed) parts.push(t(`${data.failed} failed; they stay pending.`, `${data.failed} fallaron; quedan pendientes.`));
      if (data.pending > 0) {
        parts.push(
          t(
            `${data.pending} still pending: come back tomorrow and click again to send the rest.`,
            `Quedan ${data.pending} pendientes: vuelve mañana y haz clic otra vez para enviar el resto.`,
          ),
        );
      }
      setResult(parts.join(' '));
      router.refresh();
    } catch {
      setError(t('Network error. Nothing was lost: click again to resume.', 'Error de conexión. No se perdió nada: haz clic otra vez para retomar.'));
    } finally {
      setSending(false);
    }
  }

  if (!plan) return <p className="text-sm text-gray-500">{t('Loading…', 'Cargando…')}</p>;

  return (
    <div className="space-y-4 text-sm">
      <p className="text-gray-600">
        {t(
          'Sent from SendCert as "<organizer> via SendCert", with replies going to your email. Each email includes the person’s link and an unsubscribe link.',
          'Se envían desde SendCert como "<organizador> via SendCert" y las respuestas llegan a tu correo. Cada correo incluye el enlace personal y un enlace para darse de baja.',
        )}
      </p>
      <label className="block">
        <span className="font-medium text-gray-700">{t('Subject', 'Asunto')}</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </label>
      <label className="block">
        <span className="font-medium text-gray-700">{t('Message', 'Mensaje')}</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs" />
        <span className="mt-1 block text-xs text-gray-500">
          {t('{{name}} and {{link}} are replaced for each person.', '{{name}} y {{link}} se reemplazan para cada persona.')}
        </span>
      </label>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-700">
        {plan.pending === 0 ? (
          <p>{t('Everyone on the list has been invited.', 'Ya se invitó a todas las personas de la lista.')}</p>
        ) : plan.now === 0 ? (
          <p>
            {plan.monthlyRemaining === 0
              ? t('You reached this month’s email limit.', 'Llegaste al límite de correos de este mes.')
              : t(
                  `${plan.pending} pending. Today’s sending limit is used up: come back tomorrow to send them.`,
                  `${plan.pending} pendientes. Hoy ya se usó el límite diario de envíos: vuelve mañana para enviarlas.`,
                )}
          </p>
        ) : (
          <p>
            {plan.pending === 1
              ? t('1 person hasn’t been invited yet. ', '1 persona todavía no recibió la invitación. ')
              : t(`${plan.pending} people haven’t been invited yet. `, `${plan.pending} personas todavía no recibieron la invitación. `)}
            <strong>{t(`${plan.now} can go out today`, `Hoy pueden salir ${plan.now}`)}</strong>
            {plan.later > 0
              ? t(`; ${plan.later} will be left for tomorrow (daily sending limit).`, `; ${plan.later} quedarán para mañana (límite diario de envíos).`)
              : '.'}
          </p>
        )}
        {plan.unsubscribed > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            {plan.unsubscribed === 1
              ? t('1 unsubscribed person is skipped.', 'Se omite 1 persona dada de baja.')
              : t(`${plan.unsubscribed} unsubscribed people are skipped.`, `Se omiten ${plan.unsubscribed} personas dadas de baja.`)}
          </p>
        )}
      </div>

      <button type="button" disabled={sending || plan.now === 0 || !subject.trim() || !body.trim()} onClick={send} className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        {sending
          ? t('Sending…', 'Enviando…')
          : plan.invited > 0
            ? t(`Send ${plan.now} more`, `Enviar ${plan.now} más`)
            : t(`Send ${plan.now} invitations`, `Enviar ${plan.now} invitaciones`)}
      </button>
      {result && <p className="text-green-800">{result}</p>}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
