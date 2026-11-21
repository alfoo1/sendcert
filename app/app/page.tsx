'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StepIndicator from '@/components/StepIndicator';
import { CERT_HEIGHT, CERT_WIDTH } from '@/components/CertificateRenderer';
import { trackEvent } from '@/components/Analytics';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draft';
import TemplateStep from '@/components/TemplateStep';
import ConfigStep, { type TextConfig } from '@/components/ConfigStep';
import StudentsStep, { type Recipient } from '@/components/StudentsStep';
import EmailStep, { type EmailConfig } from '@/components/EmailStep';
import PreviewStep from '@/components/PreviewStep';
import { PRESET_TEMPLATES } from '@/lib/templates';
import { isValidEmail } from '@/lib/validation';
import {
  getDefaultContent,
  type CertificateContent,
} from '@/lib/certificateContent';
import {
  defaultExtraFields,
  type ExtraField,
} from '@/lib/extraFields';

// Main wizard. State lives in the component; the design (not the recipient
// list) is autosaved in the browser so a refresh or a later visit resumes it.
export default function SendCertApp() {
  const [step, setStep] = useState(1);

  // Step 1: template
  const [templateDataUrl, setTemplateDataUrl] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);

  // Step 2: text config
  const [textConfig, setTextConfig] = useState<TextConfig>({
    x: 50,
    y: 50,
    fontSize: 48,
    color: '#1f2937',
    fontFamily: 'helvetica',
  });

  // Step 2 also: certificate content (built-in templates only). null for custom uploads.
  const [content, setContent] = useState<CertificateContent | null>(null);

  // Extra text overlays drawn on top of the certificate (signature, date, etc.).
  // Seeded with sensible defaults so the certificate has a usable signature +
  // date out of the box regardless of template choice.
  const [extraFields, setExtraFields] = useState<ExtraField[]>(defaultExtraFields);

  // When the user edits a built-in template we snapshot the DOM to a flat image
  // just before leaving step 2. That image replaces the preset's static file
  // when the server generates PDFs — so all edits (text, logo, accent color)
  // are baked in and pdf-lib still overlays the recipient name on top.
  const [renderedTemplateDataUrl, setRenderedTemplateDataUrl] = useState<string | null>(
    null,
  );
  const certificateRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);

  // Step 3: recipients
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  // Step 4: email content
  const DEFAULT_EMAIL_CONFIG: EmailConfig = {
    subject: 'Your certificate',
    body:
      'Hi {{name}},\n\nCongratulations on completing the course. Your certificate is attached to this email.\n\nBest regards!',
  };
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(DEFAULT_EMAIL_CONFIG);

  // ---------- Design autosave ----------
  // `draftLoaded` blocks saving until the stored draft has been read, so the
  // empty initial state never overwrites it.
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadDraft().then((draft) => {
      if (cancelled) return;
      const knownTemplate =
        draft?.templateDataUrl ||
        (draft?.templateId && PRESET_TEMPLATES.some((t) => t.id === draft.templateId));
      if (draft && knownTemplate) {
        setTemplateDataUrl(draft.templateDataUrl);
        setTemplateId(draft.templateId);
        setRenderedTemplateDataUrl(draft.renderedTemplateDataUrl);
        setTextConfig(draft.textConfig as TextConfig);
        setContent(draft.content as CertificateContent | null);
        setExtraFields(draft.extraFields as ExtraField[]);
        setEmailConfig(draft.emailConfig as EmailConfig);
        setStep(2);
        setDraftRestored(true);
      }
      setDraftLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftLoaded || !(templateDataUrl || templateId)) return;
    const timer = setTimeout(() => {
      saveDraft({
        savedAt: Date.now(),
        templateDataUrl,
        templateId,
        renderedTemplateDataUrl,
        textConfig,
        content,
        extraFields,
        emailConfig,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [
    draftLoaded,
    templateDataUrl,
    templateId,
    renderedTemplateDataUrl,
    textConfig,
    content,
    extraFields,
    emailConfig,
  ]);

  useEffect(() => {
    trackEvent('wizard_step', { step });
  }, [step]);

  // Reset callbacks exposed to the success screen in PreviewStep.
  // `resetAll` clears every wizard step — fresh start.
  function resetAll() {
    clearDraft();
    setDraftRestored(false);
    setStep(1);
    setTemplateDataUrl(null);
    setTemplateId(null);
    setContent(null);
    setTextConfig({
      x: 50,
      y: 50,
      fontSize: 48,
      color: '#1f2937',
      fontFamily: 'helvetica',
    });
    setRenderedTemplateDataUrl(null);
    setExtraFields(defaultExtraFields());
    setRecipients([]);
    setEmailConfig(DEFAULT_EMAIL_CONFIG);
  }
  // `resetAudience` keeps the template + design + email template so the user
  // can fire the same certificate at a different group — only recipients
  // (step 3) and the step-5 send state (via PreviewStep remount) are cleared.
  function resetAudience() {
    setRecipients([]);
    setStep(3);
  }

  // Changing template: reset name position to the preset's suggested values and
  // seed the content form with the preset's default copy.
  function handleTemplateChange(payload: {
    templateDataUrl: string | null;
    templateId: string | null;
  }) {
    setTemplateDataUrl(payload.templateDataUrl);
    setTemplateId(payload.templateId);
    // Stale cache: any previously captured render no longer matches the new template.
    setRenderedTemplateDataUrl(null);

    if (payload.templateId) {
      const preset = PRESET_TEMPLATES.find((p) => p.id === payload.templateId);
      if (preset) {
        setTextConfig({
          x: preset.defaultX,
          y: preset.defaultY,
          fontSize: preset.defaultFontSize,
          color: preset.defaultColor,
          fontFamily: preset.defaultFontFamily,
        });
      }
      setContent(getDefaultContent(payload.templateId));
    } else {
      setContent(null);
    }
  }

  // Dynamically import html2canvas only when needed — it's a large dep and
  // the landing/blog shouldn't pay for it. Captures the hidden natural-size
  // certificate copy (not the visible scaled one) at CERT_WIDTH x CERT_HEIGHT.
  //
  // Before snapshotting we:
  //   1. Flush React state by waiting for two animation frames (one for
  //      commit, one for paint).
  //   2. Wait for document.fonts to finish loading — otherwise Georgia/Inter
  //      may be substituted mid-capture, causing collapsed text layouts.
  //   3. Wait for every <img> inside the cert to resolve complete.
  //   4. Force html2canvas to render at exactly 1200x900 — regardless of the
  //      element's reported size, which can be off if any transform lingers.
  const captureTemplate = useCallback(async (): Promise<string | null> => {
    const node = certificateRef.current;
    if (!node) return null;
    setCapturing(true);
    try {
      // Two rAF ticks: the first is the commit after state changes, the second
      // guarantees layout + paint has run.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      // Fonts
      const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
      if (fonts?.ready) {
        try {
          await fonts.ready;
        } catch {
          // Ignore font loading failures — fall back to whatever's available.
        }
      }

      // Images (logo, any inline imagery)
      const imgs = Array.from(node.querySelectorAll('img'));
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) {
                resolve();
                return;
              }
              const done = () => resolve();
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
            }),
        ),
      );

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: CERT_WIDTH,
        height: CERT_HEIGHT,
        windowWidth: CERT_WIDTH,
        windowHeight: CERT_HEIGHT,
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to capture template:', err);
      return null;
    } finally {
      setCapturing(false);
    }
  }, []);

  // Next-button handler: on the 2 → 3 transition we capture the live template
  // into a bitmap so downstream steps have a stable image to work with.
  async function handleNext() {
    if (step === 2 && templateId && !templateDataUrl) {
      const dataUrl = await captureTemplate();
      if (dataUrl) setRenderedTemplateDataUrl(dataUrl);
    }
    setStep((s) => Math.min(5, s + 1));
  }

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return Boolean(templateDataUrl || templateId);
      case 2:
        return true;
      case 3:
        return recipients.some((r) => r.name && isValidEmail(r.email));
      case 4:
        return (
          emailConfig.subject.trim().length > 0 &&
          emailConfig.body.trim().length > 0 &&
          (!emailConfig.replyTo?.trim() || isValidEmail(emailConfig.replyTo))
        );
      default:
        return true;
    }
  }, [step, templateDataUrl, templateId, recipients, emailConfig]);

  // For downstream steps: the "effective" template data URL is either the
  // captured live render (built-in + edits) or the user's uploaded image.
  const effectiveTemplateDataUrl = templateDataUrl ?? renderedTemplateDataUrl;
  // We only pass templateId when no data URL override exists — the API prefers
  // templateDataUrl when both are present, so keeping the id here would be
  // ambiguous. Built-in templates ride on the captured data URL instead.
  const effectiveTemplateId = templateDataUrl || renderedTemplateDataUrl
    ? null
    : templateId;
  // For usage stats: did they upload their own design or use one of ours?
  const templateKind = templateDataUrl ? 'custom' : (templateId ?? 'unknown');

  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              S
            </span>
            SendCert
          </Link>
          <div className="flex items-center gap-4">
            {/* Privacy badge — hidden below the `sm` breakpoint so mobile
                headers only carry the logo + back link. */}
            <span className="hidden items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 sm:inline-flex">
              🔒 Guest sends aren&apos;t stored
            </span>
            <Link
              href="/"
              className="text-xs text-gray-400 transition-colors hover:text-gray-600"
            >
              ← Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10">
          <StepIndicator currentStep={step} />
        </div>

        {draftRestored && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm text-gray-700">
            <span>Welcome back. We restored your last certificate design.</span>
            <button
              type="button"
              onClick={resetAll}
              className="font-medium text-brand-700 underline hover:text-brand-900"
            >
              Start over
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
          {step === 1 && (
            <TemplateStep
              templateDataUrl={templateDataUrl}
              templateId={templateId}
              onTemplateChange={handleTemplateChange}
            />
          )}
          {step === 2 && (
            <ConfigStep
              templateDataUrl={templateDataUrl}
              templateId={templateId}
              textConfig={textConfig}
              onConfigChange={setTextConfig}
              content={content}
              onContentChange={setContent}
              certificateRef={certificateRef}
              extraFields={extraFields}
              onExtraFieldsChange={setExtraFields}
            />
          )}
          {step === 3 && (
            <StudentsStep
              recipients={recipients}
              onRecipientsChange={setRecipients}
            />
          )}
          {step === 4 && (
            <EmailStep
              emailConfig={emailConfig}
              onEmailConfigChange={setEmailConfig}
            />
          )}
          {step === 5 && (
            <PreviewStep
              templateDataUrl={effectiveTemplateDataUrl}
              templateId={effectiveTemplateId}
              textConfig={textConfig}
              extraFields={extraFields}
              recipients={recipients}
              emailConfig={emailConfig}
              onResetAll={resetAll}
              onResetAudience={resetAudience}
              templateKind={templateKind}
            />
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || capturing}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Back
          </button>
          {step < 5 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canContinue || capturing}
              className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {capturing ? 'Saving template…' : 'Next →'}
            </button>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-gray-50 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 text-xs text-gray-500 sm:flex-row">
          <span>
            🔒 Guest sends aren&apos;t stored. Your files and recipient list are used only
            to deliver your certificates.
          </span>
          <span>© {new Date().getFullYear()} SendCert</span>
        </div>
      </footer>
    </>
  );
}
