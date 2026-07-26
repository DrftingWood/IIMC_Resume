import React, { createContext, useContext } from 'react';

interface ReviewContextValue {
  /** Open the ask-for-review flow for these entity ids. */
  askForReview: (entityIds: string[]) => void;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({
  value,
  children,
}: {
  value: ReviewContextValue;
  children: React.ReactNode;
}) {
  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

/**
 * Button that starts a review request for one bullet.
 *
 * Renders nothing when there is no provider, so templates that have not opted
 * into review (and any form rendered outside the editor) are unaffected.
 */
export function AskForReviewButton({ entityId }: { entityId: string }) {
  const ctx = useContext(ReviewContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={() => ctx.askForReview([entityId])}
      title="Ask someone to review this bullet"
      aria-label="Ask for a review of this bullet"
      className="ui-transition inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100"
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      Review
    </button>
  );
}
