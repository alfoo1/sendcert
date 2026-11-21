import { TemplateThumbnail } from '@/components/CertificateRenderer';

// Illustrative product shot: a real built-in template plus a mock of the email
// each recipient gets. Decorative only.
export default function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-xl pb-24 sm:pb-16" aria-hidden>
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-100 via-white to-amber-50 sm:-inset-8" />

      <div className="rounded-xl bg-white p-2 shadow-2xl ring-1 ring-black/5 sm:-rotate-1">
        <div className="overflow-hidden rounded-lg">
          <TemplateThumbnail templateId="elegant" />
        </div>
      </div>

      <div className="absolute bottom-0 left-3 right-3 rounded-xl bg-white p-4 text-left shadow-xl ring-1 ring-black/5 sm:-left-6 sm:right-auto sm:w-80">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            S
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">Your certificate, Maria</p>
            <p className="truncate text-xs text-gray-500">To: maria.johnson@example.com</p>
          </div>
          <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
            ✓ Sent
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">PDF</span>
          <span className="truncate text-xs font-medium text-gray-700">
            certificate-Maria-Johnson.pdf
          </span>
        </div>
        <div className="mt-2 flex gap-2">
          <span className="flex-1 truncate rounded-md bg-brand-600 px-2 py-1.5 text-center text-[11px] font-semibold text-white">
            View &amp; verify
          </span>
          <span className="flex-1 truncate rounded-md border border-gray-200 px-2 py-1.5 text-center text-[11px] font-semibold text-[#0A66C2]">
            Add to LinkedIn
          </span>
        </div>
      </div>
    </div>
  );
}
