'use client';

import { useEffect } from 'react';
import { reportEvent } from '@/lib/clientEvents';

// Noise that isn't ours to fix: browser quirks and extension errors.
const IGNORED = [/ResizeObserver loop/i, /^Script error\.?$/i, /extension:\/\//i, /Non-Error promise rejection/i];

function ignored(message: string, source?: string): boolean {
  if (IGNORED.some((re) => re.test(message))) return true;
  // Errors thrown by scripts from other origins (extensions, injected widgets).
  if (source && !source.startsWith(window.location.origin)) return true;
  return false;
}

/** Sends uncaught JavaScript errors to the event log (mounted in the root layout). */
export default function ErrorReporter() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      const message = event.message || String(event.error ?? 'Unknown error');
      if (ignored(message, event.filename)) return;
      reportEvent('client.error', message, {
        source: event.filename?.replace(window.location.origin, ''),
        line: event.lineno,
        stack: event.error instanceof Error ? event.error.stack?.slice(0, 1500) : undefined,
      });
    }
    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      if (ignored(message)) return;
      reportEvent('client.error', message, {
        unhandledRejection: true,
        stack: reason instanceof Error ? reason.stack?.slice(0, 1500) : undefined,
      });
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
