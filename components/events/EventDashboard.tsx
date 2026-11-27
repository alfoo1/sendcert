'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import StudentsStep, { type Recipient as NewPerson } from '@/components/StudentsStep';
import ShareCardDesigner from '@/components/events/ShareCardDesigner';
import type { ShareCardEvent } from '@/components/events/ShareCardMaker';
import { bucketOf, countStatuses, type Bucket } from '@/lib/eventMode/logic';
import type { EventRecipient, ShareCardSettings } from '@/lib/eventMode/types';
import { isValidEmail } from '@/lib/validation';
import { LOCALE_TAG, tx, type Locale } from '@/lib/i18n';

type Filter = 'all' | Bucket | 'unsubscribed';

/** Organizer view of an event: who is coming, who isn't, who hasn't answered. */
export default function EventDashboard({
  locale,
  eventId,
  people,
  siteUrl,
  invite,
  shareCard,
  previewCard,
}: {
  locale: Locale;
  eventId: string;
  people: EventRecipient[];
  siteUrl: string;
  invite: { subject: string; body: string };
  shareCard: ShareCardSettings;
  previewCard: ShareCardEvent;
}) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newPeople, setNewPeople] = useState<NewPerson[]>([]);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<string | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [card, setCard] = useState<ShareCardSettings>(shareCard);
  const [cardSaving, setCardSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const counts = countStatuses(people);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (filter === 'unsubscribed' ? !p.unsubscribed : filter !== 'all' && bucketOf(p) !== filter) return false;
      return !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.rsvpReason ?? '').toLowerCase().includes(q);
    });
  }, [people, filter, query]);

  const tiles: { key: Filter; label: string; value: number; tone: string }[] = [
    { key: 'coming', label: t('Coming', 'Van'), value: counts.coming, tone: 'border-green-200 bg-green-50 text-green-900' },
    { key: 'not_coming', label: t('Not coming', 'No van'), value: counts.notComing, tone: 'border-red-200 bg-red-50 text-red-900' },
    { key: 'no_answer', label: t('No answer', 'Sin respuesta'), value: counts.noAnswer, tone: 'border-amber-200 bg-amber-50 text-amber-900' },
    { key: 'unsubscribed', label: t('Unsubscribed', 'Dados de baja'), value: counts.unsubscribed, tone: 'border-gray-200 bg-gray-50 text-gray-800' },
  ];

  const badge: Record<Bucket, { text: string; cls: string }> = {
    coming: { text: t('Coming', 'Va'), cls: 'bg-green-100 text-green-800' },
    not_coming: { text: t('Not coming', 'No va'), cls: 'bg-red-100 text-red-800' },
    no_answer: { text: t('No answer', 'Sin respuesta'), cls: 'bg-amber-100 text-amber-800' },
  };

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  }

  async function addPeople() {
    const valid = newPeople.filter((p) => p.name.trim() && isValidEmail(p.email));
    if (valid.length === 0) return;
    setAdding(true);
    setAddResult(null);
    try {
      const res = await fetch(`/api/events/${eventId}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: valid }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddResult(data.error ?? t('Could not add them.', 'No se pudieron agregar.'));
        return;
      }
      setAddResult(
        t(
          `Added ${data.added}${data.duplicates ? ` (${data.duplicates} were already on the list)` : ''}. Download the links again to invite them.`,
          `Se agregaron ${data.added}${data.duplicates ? ` (${data.duplicates} ya estaban en la lista)` : ''}. Vuelve a descargar los enlaces para invitarlos.`,
        ),
      );
      setNewPeople([]);
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  async function saveCard() {
    setCardSaving('saving');
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCard: card }),
      });
      setCardSaving(res.ok ? 'saved' : 'error');
      if (res.ok) router.refresh();
    } catch {
      setCardSaving('error');
    }
  }

  const exportBase = `/api/events/${eventId}/export`;
  const statusParam = filter === 'all' ? '' : `&status=${filter}`;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => setFilter(filter === tile.key ? 'all' : tile.key)}
            className={`rounded-xl border p-4 text-left transition ${tile.tone} ${filter === tile.key ? 'ring-2 ring-brand-500' : ''}`}
          >
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">{tile.label}</p>
            <p className="mt-1 text-3xl font-semibold">{tile.value}</p>
          </button>
        ))}
      </section>

      <section className="flex flex-wrap gap-2">
        <a href={`${exportBase}?type=links`} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          {t('Download personal links (CSV)', 'Descargar enlaces personales (CSV)')}
        </a>
        <a href={`${exportBase}?type=responses${statusParam}`} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800">
          {filter === 'all' ? t('Export answers (CSV)', 'Exportar respuestas (CSV)') : t('Export this list (CSV)', 'Exportar esta lista (CSV)')}
        </a>
        <button type="button" onClick={() => copy(`${invite.subject}\n\n${invite.body}`, 'invite')} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800">
          {copied === 'invite' ? t('Copied ✓', 'Copiado ✓') : t('Copy invitation text', 'Copiar texto de la invitación')}
        </button>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 text-sm">
            {(['all', 'coming', 'not_coming', 'no_answer', 'unsubscribed'] as Filter[]).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 ${filter === f ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-600'}`}>
                {f === 'all' ? `${t('All', 'Todos')} (${counts.total})` : tiles.find((x) => x.key === f)?.label}
              </button>
            ))}
          </div>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search name, email or reason', 'Buscar nombre, correo o motivo')} className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2 font-medium">{t('Name', 'Nombre')}</th>
                <th className="px-4 py-2 font-medium">{t('Email', 'Correo')}</th>
                <th className="px-4 py-2 font-medium">{t('Answer', 'Respuesta')}</th>
                <th className="px-4 py-2 font-medium">{t('Reason', 'Motivo')}</th>
                <th className="px-4 py-2 font-medium">{t('Personal link', 'Enlace personal')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    {t('Nobody here yet.', 'Todavía no hay nadie acá.')}
                  </td>
                </tr>
              )}
              {visible.map((p) => {
                const b = badge[bucketOf(p)];
                return (
                  <tr key={p.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.email}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.cls}`}>{b.text}</span>
                      {p.unsubscribed && (
                        <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{t('Unsubscribed', 'De baja')}</span>
                      )}
                      {p.respondedAt && (
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(p.respondedAt).toLocaleDateString(LOCALE_TAG[locale], { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-gray-600">{p.rsvpReason ?? ''}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      <button type="button" onClick={() => copy(`${siteUrl}/e/${p.token}`, p.id)} className="text-brand-600 hover:underline">
                        {copied === p.id ? t('Copied ✓', 'Copiado ✓') : t('Copy link', 'Copiar enlace')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {t(
            '“Not coming” only means they won’t attend. “Unsubscribed” means they asked for no more emails; that is a separate list.',
            '“No van” solo significa que no asistirán. “Dados de baja” pidieron no recibir más correos; es una lista aparte.',
          )}
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white">
        <button type="button" onClick={() => setAddOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-gray-900">
          <span>{t('Add people (late registrations)', 'Agregar personas (inscripciones tardías)')}</span>
          <span className="text-gray-400">{addOpen ? '−' : '+'}</span>
        </button>
        {addOpen && (
          <div className="border-t border-gray-200 p-5">
            <StudentsStep recipients={newPeople} onRecipientsChange={setNewPeople} />
            <div className="mt-4 flex items-center gap-3">
              <button type="button" disabled={adding || newPeople.length === 0} onClick={addPeople} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {adding ? t('Adding…', 'Agregando…') : t('Add to the event', 'Agregar al evento')}
              </button>
              {addResult && <p className="text-sm text-gray-700">{addResult}</p>}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white">
        <button type="button" onClick={() => setCardOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-gray-900">
          <span>{t('Share card', 'Tarjeta para compartir')}</span>
          <span className="text-gray-400">{cardOpen ? '−' : '+'}</span>
        </button>
        {cardOpen && (
          <div className="border-t border-gray-200 p-5">
            <ShareCardDesigner locale={locale} value={card} onChange={(v) => { setCard(v); setCardSaving('idle'); }} previewEvent={{ ...previewCard, design: null }} sampleName={people[0]?.name ?? 'Jane Doe'} />
            <div className="mt-4 flex items-center gap-3">
              <button type="button" disabled={cardSaving === 'saving'} onClick={saveCard} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {cardSaving === 'saving' ? t('Saving…', 'Guardando…') : t('Save share card', 'Guardar tarjeta')}
              </button>
              {cardSaving === 'saved' && <span className="text-sm text-green-700">{t('Saved ✓', 'Guardado ✓')}</span>}
              {cardSaving === 'error' && <span className="text-sm text-red-600">{t('Could not save.', 'No se pudo guardar.')}</span>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
