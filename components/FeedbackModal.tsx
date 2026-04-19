'use client';

import { useEffect, useState } from 'react';
import { trackEvent } from './Analytics';

type Props = {
  open: boolean;
  recipientCount: number;
  onClose: () => void;
};

// Post-send satisfaction capture. Shown only when every certificate landed —
// surfacing it after partial failures would prime users to rate badly for
// reasons orthogonal to the product experience.
export default function FeedbackModal({ open, recipientCount, onClose }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  // Reset local form state each time the modal opens so consecutive sends in
  // the same session don't inherit the previous rating.
  useEffect(() => {
    if (open) {
      setRating(0);
      setHoverRating(0);
      setComment('');
      setSubmitting(false);
      setShowThanks(false);
    }
  }, [open]);

  if (!open) return null;

  function dismissAfterThanks() {
    setShowThanks(true);
    // 2s thank-you then auto-close. onClose is what collapses the modal in the
    // parent so a delayed unmount doesn't race the visible fade.
    setTimeout(() => {
      setShowThanks(false);
      onClose();
    }, 2000);
  }

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, recipientCount }),
      });
      trackEvent('feedback_submitted', { rating });
    } catch {
      // Network failures are silently swallowed — better to thank the user
      // than leak an error over what is optional data collection.
    }
    dismissAfterThanks();
  }

  function handleSkip() {
    dismissAfterThanks();
  }

  // Display rating = hover preview when hovering, otherwise the locked-in value.
  const displayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {showThanks ? (
          <div className="py-8 text-center">
            <div className="text-4xl">🙌</div>
            <p className="mt-3 text-lg font-semibold text-gray-900">Thanks for your feedback!</p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900">
              How was your experience?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Your feedback helps us make SendCert better.
            </p>

            {/* Star rating */}
            <div
              className="mt-5 flex items-center justify-center gap-2"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  className="text-4xl transition-transform hover:scale-110"
                  style={{
                    color: n <= displayRating ? '#f59e0b' : '#d1d5db',
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            {/* Optional comment */}
            <label className="mt-5 block text-sm font-medium text-gray-700">
              Any feedback? (optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what worked or what could be better…"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
                className="text-sm text-gray-500 underline hover:text-gray-700 disabled:opacity-50"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Submit feedback'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
