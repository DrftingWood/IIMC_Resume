import { useEffect, useState } from 'react';
import { mockReviewApi } from './mockApi';

/** Re-render on any change to the review store or the active persona. */
export function useReviewStore(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => mockReviewApi.subscribe(() => setTick((t) => t + 1)), []);
  return tick;
}

export { mockReviewApi as reviewApi };
