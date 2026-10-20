import { useLayoutEffect, type RefObject } from 'react';

/** Most a space may shrink to keep a line whole. Must match SQUEEZE in
    src/pdf/skynetLayout.ts so the preview wraps exactly where the PDF does. */
const SQUEEZE = 0.2;

/**
 * The PDF writer keeps a point that overflows its line only slightly on one
 * line by narrowing its spaces, as the official exports do. Browsers cannot
 * do that, so after each render this finds points that wrapped but would fit
 * with their spaces up to SQUEEZE narrower, and gives exactly those the same
 * negative word spacing. Everything else is left to wrap normally.
 */
export function useSqueezeToFit(root: RefObject<HTMLElement>, selector: string, deps: unknown[]) {
  useLayoutEffect(() => {
    const run = () => {
      const el = root.current;
      if (!el) return;
      for (const span of el.querySelectorAll<HTMLElement>(selector)) {
        span.style.wordSpacing = '';
        span.style.whiteSpace = '';
        if (span.getClientRects().length < 2) continue;
        const cell = span.parentElement;
        if (!cell) continue;
        const cs = getComputedStyle(cell);
        const avail = cell.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        span.style.whiteSpace = 'nowrap';
        const over = span.offsetWidth - avail;
        const spaces = ((span.textContent ?? '').trim().match(/ /g) ?? []).length;
        // A space is ~0.226em in Calibri/Carlito, plus any letter-spacing
        // (Industry's 0.15pt), as the PDF writer counts it.
        const ss = getComputedStyle(span);
        const spaceW = 0.226 * parseFloat(ss.fontSize) + (parseFloat(ss.letterSpacing) || 0);
        if (spaces && over > 0 && over <= spaces * spaceW * SQUEEZE) {
          span.style.wordSpacing = `${-over / spaces}px`;
        } else {
          span.style.whiteSpace = '';
        }
      }
    };
    run();
    // Widths change once the web font arrives; measure again then.
    let alive = true;
    document.fonts?.ready.then(() => alive && run());
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
