'use client';

// Visual wizard progress — 5 steps.
const STEP_LABELS = ['Template', 'Position', 'Recipients', 'Email', 'Send'];

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <ol className="flex items-center justify-between gap-2">
      {STEP_LABELS.map((label, idx) => {
        const step = idx + 1;
        const isActive = step === currentStep;
        const isDone = step < currentStep;
        return (
          <li key={label} className="flex flex-1 items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                isDone
                  ? 'bg-brand-600 text-white'
                  : isActive
                    ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-600'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isDone ? '✓' : step}
            </div>
            <span
              className={`hidden text-sm font-medium sm:inline ${
                isActive ? 'text-gray-900' : isDone ? 'text-gray-700' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
            {step < STEP_LABELS.length && (
              <div
                className={`ml-auto hidden h-0.5 flex-1 sm:block ${
                  isDone ? 'bg-brand-600' : 'bg-gray-200'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
