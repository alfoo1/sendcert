'use client';

import { useMemo, useState } from 'react';
import type { Recipient } from '@/lib/account';
import { tx, type Locale } from '@/lib/i18n';
import { reportRequestFailure } from '@/lib/clientEvents';

type RowState =
  | { mode: 'idle' }
  | { mode: 'confirm' }
  | { mode: 'edit'; name: string; email: string }
  | { mode: 'sending' }
  | { mode: 'done'; message: string }
  | { mode: 'error'; message: string };

/**
 * Recipients of one send with their verification links. Each row can be
 * resent, or edited (name/email typo) and resent; the verification ID stays
 * the same so shared links keep working.
 */
export default function RecipientsTable({
  locale,
  siteUrl,
  recipients: initial,
}: {
  locale: Locale;
  siteUrl: string;
  recipients: Recipient[];
}) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  const [recipients, setRecipients] = useState(initial);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((r) => r.name.toLowerCase().includes(q) || (r.email ?? '').toLowerCase().includes(q));
  }, [recipients, query]);

  const setRow = (id: string, state: RowState) => setRows((prev) => ({ ...prev, [id]: state }));

  async function resend(r: Recipient, changes?: { name: string; email: string }) {
    setRow(r.verifyId, { mode: 'sending' });
    try {
      const res = await fetch('/api/certificates/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifyId: r.verifyId, ...changes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data.error ?? t('Could not resend.', 'No se pudo reenviar.');
        if (res.status >= 500) reportRequestFailure('/api/certificates/resend', res.status, message);
        setRow(r.verifyId, { mode: 'error', message });
        return;
      }
      setRecipients((prev) =>
        prev.map((p) => (p.verifyId === r.verifyId ? { ...p, name: data.name ?? p.name, email: data.email ?? p.email } : p)),
      );
      setRow(r.verifyId, { mode: 'done', message: t(`Sent to ${data.email}`, `Enviado a ${data.email}`) });
    } catch (err) {
      reportRequestFailure('/api/certificates/resend', null, err instanceof Error ? err.message : String(err));
      setRow(r.verifyId, { mode: 'error', message: t('Network error. Try again.', 'Error de conexión. Inténtalo de nuevo.') });
    }
  }

  function copy(verifyId: string) {
    navigator.clipboard?.writeText(`${siteUrl}/verify/${verifyId}`).catch(() => {});
    setCopied(verifyId);
    setTimeout(() => setCopied((c) => (c === verifyId ? null : c)), 1500);
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{t('Recipients', 'Destinatarios')}</h2>
        {recipients.length > 10 && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Search name or email', 'Buscar nombre o correo')}
            className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {t(
          'Resending uses the same design, message and verification link, and counts as 1 certificate of your monthly limit.',
          'Reenviar usa el mismo diseño, mensaje y enlace de verificación, y cuenta como 1 certificado de tu límite mensual.',
        )}
      </p>

      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-2 font-medium">{t('Name', 'Nombre')}</th>
              <th className="px-4 py-2 font-medium">{t('Email', 'Correo')}</th>
              <th className="px-4 py-2 font-medium">{t('Verification', 'Verificación')}</th>
              <th className="px-4 py-2 font-medium">LinkedIn</th>
              <th className="px-4 py-2 font-medium">
                <span className="sr-only">{t('Actions', 'Acciones')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((r) => {
              const state = rows[r.verifyId] ?? { mode: 'idle' };
              return (
                <tr key={r.verifyId} className="align-top">
                  {state.mode === 'edit' ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          value={state.name}
                          onChange={(e) => setRow(r.verifyId, { ...state, name: e.target.value })}
                          aria-label={t('Name', 'Nombre')}
                          className="w-full rounded border border-gray-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="email"
                          value={state.email}
                          onChange={(e) => setRow(r.verifyId, { ...state, email: e.target.value })}
                          aria-label={t('Email', 'Correo')}
                          className="w-full rounded border border-gray-300 px-2 py-1"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3 text-gray-600">{r.email ?? '—'}</td>
                    </>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    <a href={`/verify/${r.verifyId}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                      {r.verifyId}
                    </a>{' '}
                    <button type="button" onClick={() => copy(r.verifyId)} className="ml-1 text-gray-500 hover:text-gray-900">
                      {copied === r.verifyId ? t('Copied', 'Copiado') : t('Copy link', 'Copiar enlace')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.linkedInAdded ? t('✓ Added', '✓ Agregado') : '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                    {state.mode === 'idle' && (
                      <span className="flex justify-end gap-3">
                        <button type="button" onClick={() => setRow(r.verifyId, { mode: 'confirm' })} className="font-medium text-brand-600 hover:underline" disabled={!r.email}>
                          {t('Resend', 'Reenviar')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRow(r.verifyId, { mode: 'edit', name: r.name, email: r.email ?? '' })}
                          className="text-gray-600 hover:text-gray-900 hover:underline"
                        >
                          {t('Fix & resend', 'Corregir y reenviar')}
                        </button>
                      </span>
                    )}
                    {state.mode === 'confirm' && (
                      <span className="flex justify-end gap-3">
                        <button type="button" onClick={() => resend(r)} className="font-semibold text-brand-700 hover:underline">
                          {t(`Resend to ${r.email}?`, `¿Reenviar a ${r.email}?`)}
                        </button>
                        <button type="button" onClick={() => setRow(r.verifyId, { mode: 'idle' })} className="text-gray-500 hover:text-gray-900">
                          {t('Cancel', 'Cancelar')}
                        </button>
                      </span>
                    )}
                    {state.mode === 'edit' && (
                      <span className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => resend(r, { name: state.name, email: state.email })}
                          className="font-semibold text-brand-700 hover:underline"
                          disabled={!state.name.trim() || !state.email.trim()}
                        >
                          {t('Save & resend', 'Guardar y reenviar')}
                        </button>
                        <button type="button" onClick={() => setRow(r.verifyId, { mode: 'idle' })} className="text-gray-500 hover:text-gray-900">
                          {t('Cancel', 'Cancelar')}
                        </button>
                      </span>
                    )}
                    {state.mode === 'sending' && <span className="text-gray-500">{t('Sending…', 'Enviando…')}</span>}
                    {state.mode === 'done' && <span className="text-green-700">✓ {state.message}</span>}
                    {state.mode === 'error' && (
                      <span className="flex flex-col items-end gap-1">
                        <span className="whitespace-normal text-red-600">{state.message}</span>
                        <button type="button" onClick={() => setRow(r.verifyId, { mode: 'idle' })} className="text-gray-500 hover:text-gray-900">
                          {t('OK', 'Entendido')}
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
