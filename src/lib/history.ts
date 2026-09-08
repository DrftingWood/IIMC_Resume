/**
 * Undo history for the resume editor.
 *
 * Deleting a bullet, a category or a whole experience entry is a single click
 * with no confirmation, and the draft autosaves — so before this there was no
 * way back from a misclick. Typing is coalesced so an undo steps back over a
 * burst of keystrokes rather than one character at a time.
 */
export const HISTORY_LIMIT = 60;
export const COALESCE_MS = 600;

export interface History<T> {
  past: T[];
  lastPushAt: number;
}

export function emptyHistory<T>(): History<T> {
  return { past: [], lastPushAt: 0 };
}

/**
 * Record `snapshot` (the state BEFORE a change) unless it lands inside the
 * coalescing window of the previous one, in which case the older snapshot is
 * kept — undoing then returns to before the whole burst.
 */
export function record<T>(h: History<T>, snapshot: T, now: number): History<T> {
  if (h.past.length > 0 && now - h.lastPushAt < COALESCE_MS) {
    return { past: h.past, lastPushAt: now };
  }
  const past = [...h.past, snapshot];
  return {
    past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
    lastPushAt: now,
  };
}

export function undo<T>(h: History<T>): { history: History<T>; snapshot: T | undefined } {
  if (h.past.length === 0) return { history: h, snapshot: undefined };
  const snapshot = h.past[h.past.length - 1];
  return { history: { past: h.past.slice(0, -1), lastPushAt: 0 }, snapshot };
}

export function canUndo<T>(h: History<T>): boolean {
  return h.past.length > 0;
}
