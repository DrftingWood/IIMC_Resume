import { useEffect, useState, type RefObject } from 'react';

/** A4 height in CSS pixels at the 96dpi the preview is laid out against. */
export const A4_HEIGHT_PX = (842 * 96) / 72;

export interface PageOverflow {
  /** How far the rendered resume exceeds one A4 page, in points. 0 when it fits. */
  overflowPt: number;
  /** Rendered height in pages, e.g. 1.38. */
  pages: number;
  fits: boolean;
}

/**
 * Watches the rendered preview and reports whether it still fits one A4 page.
 *
 * The whole point of this app is a one-page, print-faithful export, but nothing
 * previously told a student when they had exceeded it — the overflow only showed
 * up as a second sheet in the print dialog, or after they had submitted.
 */
export function usePageOverflow(
  ref: RefObject<HTMLElement>,
  /**
   * Flips true once the preview is actually mounted. Without it the effect
   * runs a single time while the landing page is showing, finds `ref.current`
   * null, attaches nothing, and never retries — the ref object's identity is
   * stable so the dependency array never changes.
   */
  active: boolean
): PageOverflow {
  const [heightPx, setHeightPx] = useState(0);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      // scrollHeight, not getBoundingClientRect: the page carries a min-height
      // of exactly one A4, so the bounding box stops growing once content fits
      // and would report every overflowing resume as exactly one page.
      setHeightPx(el.scrollHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Row growth inside tables does not always resize the page box itself.
    const mo = new MutationObserver(measure);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [ref, active]);

  const pages = heightPx > 0 ? heightPx / A4_HEIGHT_PX : 1;
  const overflowPx = Math.max(0, heightPx - A4_HEIGHT_PX);
  return {
    overflowPt: Math.round((overflowPx * 72) / 96),
    pages: Math.round(pages * 100) / 100,
    fits: overflowPx <= 1,
  };
}
