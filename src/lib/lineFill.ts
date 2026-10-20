/**
 * Line-fill meter: how much of its line a point fills on the printed page.
 *
 * IIMC points are single lines that students fill to the right edge (in real
 * PDFs every Industry line ends within ~10pt of it). The editor reports how
 * full each point is and roughly how many characters fit or must go.
 *
 * Measurement happens on the real page: each Preview renders an invisible
 * probe row per table kind with the same classes and column widths as a real
 * row (data-fill-probe="bullet" | "industry"). Writing a point into the probe
 * and reading its line boxes uses the exact fonts, letter-spacing and widths
 * the PDF export uses, including compact mode.
 */

export type FillKind = 'bullet' | 'industry';

export interface FillReport {
  /** Line boxes the point occupies. 1 is the goal. */
  lines: number;
  /** Fraction of the line used by a one-line point, 0..1. */
  fill: number;
  /** About how many more characters fit on the line (one-line points). */
  charsLeft: number;
  /** About how many characters to cut to get back to one line. */
  overflowChars: number;
  /** A single unbroken word (a URL, say) is wider than the whole line. */
  unbreakable?: boolean;
}

interface Box {
  left: number;
  right: number;
  top: number;
}

/** Pure arithmetic over the point's line boxes, separated out for tests. */
export function analyseFill(
  rects: Box[],
  contentLeft: number,
  contentRight: number,
  chars: number
): FillReport | null {
  const width = contentRight - contentLeft;
  if (!rects.length || width <= 0 || chars <= 0) return null;

  // An inline element can report several boxes per line (e.g. around a bold
  // run); merge the ones sharing a line.
  const lines: { left: number; right: number; top: number }[] = [];
  for (const r of [...rects].sort((a, b) => a.top - b.top || a.left - b.left)) {
    const line = lines.find((l) => Math.abs(l.top - r.top) < 2);
    if (line) {
      line.left = Math.min(line.left, r.left);
      line.right = Math.max(line.right, r.right);
    } else {
      lines.push({ left: r.left, right: r.right, top: r.top });
    }
  }
  const used = lines.reduce((s, l) => s + (l.right - l.left), 0);
  if (used <= 0) return null;
  const perChar = used / chars;

  if (lines.length === 1) {
    const right = lines[0].right;
    return {
      lines: 1,
      fill: Math.min(1, Math.max(0, (right - contentLeft) / width)),
      charsLeft: Math.max(0, Math.floor((contentRight - right) / perChar)),
      overflowChars: 0,
    };
  }
  const spill = lines.slice(1).reduce((s, l) => s + (l.right - l.left), 0);
  const slack = contentRight - lines[0].right;
  // Line one holding little more than the bullet means one word is wider
  // than the line; a character count would be meaningless.
  const unbreakable = lines[0].right - contentLeft < width * 0.15;
  return {
    lines: lines.length,
    fill: 1,
    charsLeft: 0,
    // To fit one line, total width must drop to the line width: the wrapped
    // text minus the room still free at the end of line one.
    overflowChars: Math.min(chars, Math.max(1, Math.ceil((spill - slack) / perChar))),
    ...(unbreakable && { unbreakable }),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The same markup renderInline() produces (bold runs, superscript
    ordinals), as an HTML string for the probe. */
export function pointHtml(text: string): string {
  const ord = (s: string) => s.replace(/(\d+)(st|nd|rd|th)\b/g, '$1<sup>$2</sup>');
  return escapeHtml(text)
    .split(/(\*\*.+?\**\*\*)/g)
    .map((part) =>
      /^\*\*.+?\**\*\*$/.test(part) ? `<strong>${ord(part.slice(2, -2))}</strong>` : ord(part)
    )
    .join('');
}

type GraphemeSegmenter = new (
  locale: undefined,
  options: { granularity: 'grapheme' }
) => { segment(text: string): Iterable<unknown> };

/** Characters as a reader counts them: no ** bold markers, no edge spaces
    (the page collapses them), and one per grapheme, so an emoji or a Hindi
    letter with its vowel signs counts once, not as several code units. */
export function visibleLength(text: string): number {
  const plain = text
    .replace(/\*\*(.+?\**)\*\*/g, '$1')
    .split(String.fromCharCode(0x200b))
    .join('')
    .trim();
  // Intl.Segmenter is in every current browser but not in this project's
  // TypeScript lib target, hence the typed lookup.
  const Segmenter = (Intl as unknown as { Segmenter?: GraphemeSegmenter }).Segmenter;
  if (Segmenter) return [...new Segmenter(undefined, { granularity: 'grapheme' }).segment(plain)].length;
  return [...plain].length;
}

/** Measure a point in the live page's probe row. Null when there is no
    rendered page to measure against (preview closed, or no layout, as in
    tests). */
export function measureFill(text: string, kind: FillKind): FillReport | null {
  if (typeof document === 'undefined' || !text.trim()) return null;
  const span = document.querySelector<HTMLElement>(`[data-fill-probe="${kind}"]`);
  const cell = span?.parentElement;
  if (!span || !cell) return null;

  span.innerHTML = pointHtml(text);
  const box = cell.getBoundingClientRect();
  const style = getComputedStyle(cell);
  const contentLeft = box.left + parseFloat(style.paddingLeft || '0');
  const contentRight = box.right - parseFloat(style.paddingRight || '0');
  const rects = Array.from(span.getClientRects()).map((r) => ({
    left: r.left,
    right: r.right,
    top: r.top,
  }));
  span.innerHTML = '';
  // +2 counts the bullet glyph and its gap, which the first box includes.
  return analyseFill(rects, contentLeft, contentRight, visibleLength(text) + 2);
}
