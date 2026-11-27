'use client';

import { useState } from 'react';
import { tx, type Locale } from '@/lib/i18n';

export default function UnsubscribeButton({ token, locale, organizer }: { token: string; locale: Locale; organizer: string | null }) {
  const t = (en: string, es: string) => tx(locale, { en, es });
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  async function confirm() {
    setState('saving');
    try {
      const res = await fetch(`/api/e/${token}/unsubscribe`, { method: 'POST' });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
        {t(
          `Done. You won't get more emails from ${organizer ?? 'this organizer'} through SendCert.`,
          `Listo. No vas a recibir más correos de ${organizer ?? 'este organizador'} a través de SendCert.`,
        )}
      </p>
    );
  }
  return (
    <div>
      <button type="button" disabled={state === 'saving'} onClick={confirm} className="rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white disabled:opacity-50">
        {t('Unsubscribe from emails', 'Darme de baja de los correos')}
      </button>
      {state === 'error' && <p className="mt-2 text-sm text-red-600">{t('Something went wrong. Please try again.', 'Algo salió mal. Inténtalo de nuevo.')}</p>}
    </div>
  );
}
