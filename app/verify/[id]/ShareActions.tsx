'use client';

import { useState } from 'react';
import { trackEvent } from '@/components/Analytics';
import { useTx } from '@/components/i18n/LocaleProvider';

// Recipient actions on the verification page. LinkedIn buttons go through our
// redirect (/verify/<id>/linkedin) so clicks are counted server-side.
export default function ShareActions({ verifyId, pageUrl }: { verifyId: string; pageUrl: string }) {
  const [copied, setCopied] = useState(false);
  const t = useTx();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t({ en: 'Copy this link:', es: 'Copia este enlace:' }), pageUrl);
    }
    trackEvent('share_click', { kind: 'copy_link' });
    fetch('/api/share-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifyId }),
    }).catch(() => {});
  }

  const base = `/verify/${encodeURIComponent(verifyId)}/linkedin?from=page`;

  return (
    <div className="space-y-2.5">
      <a
        href={`${base}&type=add`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('share_click', { kind: 'linkedin_add' })}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0a66c2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004182]"
      >
        <LinkedInIcon />
        {t({ en: 'Add to LinkedIn profile', es: 'Agregar al perfil de LinkedIn' })}
      </a>
      <div className="grid grid-cols-2 gap-2.5">
        <a
          href={`${base}&type=share`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('share_click', { kind: 'linkedin_share' })}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
        >
          {t({ en: 'Share post', es: 'Publicar' })}
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
        >
          {copied
            ? t({ en: 'Link copied ✓', es: 'Enlace copiado ✓' })
            : t({ en: 'Copy link', es: 'Copiar enlace' })}
        </button>
      </div>
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}
