import { useEffect, useState } from 'react';
import type { SkynetResumeData } from '@/templates/skynet/types';
import type { FitResult } from './fitCheck';

type Check = (data: SkynetResumeData) => FitResult;

/**
 * Whether the Skynet resume fits one page, judged by the PDF writer's own
 * layout. Null until the writer's fonts have loaded (a second or so after the
 * editor opens; cached by the browser afterwards) or when `data` is null -
 * callers fall back to measuring the preview meanwhile.
 */
export function useSkynetFit(data: SkynetResumeData | null): FitResult | null {
  const [check, setCheck] = useState<Check | null>(null);
  const active = Boolean(data);

  useEffect(() => {
    if (!active || check) return;
    let alive = true;
    // Let the editor finish loading first; the fonts are ~1.3 MB.
    const t = setTimeout(() => {
      import('./fitCheck')
        .then((m) => m.loadSkynetFitCheck())
        .then((c) => alive && setCheck(() => c))
        .catch(() => {
          /* Offline or blocked: the preview measure stays in charge. */
        });
    }, 1200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [active, check]);

  const [result, setResult] = useState<FitResult | null>(null);
  useEffect(() => {
    if (!check || !data) {
      setResult(null);
      return;
    }
    // Debounced: typing re-lays out the page at most every 150ms.
    const t = setTimeout(() => {
      try {
        setResult(check(data));
      } catch {
        setResult(null);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [check, data]);

  return result;
}
