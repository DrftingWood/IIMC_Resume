/**
 * Text handling shared by the PDF writer and the one-page check, so the
 * check measures exactly what the export will draw.
 */

/** Word sets body text with neither ligatures nor kerning; the browser's
    default "ti" ligature is one of the tells of a printed web page. */
export const FEATURES = { liga: false, clig: false, dlig: false, calt: false, kern: false };

/** Zero-width and soft characters (incl. the plain-ordinal marker, see
    markPlainOrdinals): nothing to draw. Control characters likewise. */
const INVISIBLE = new Set([
  0xad, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff,
  // Direction marks and bidi controls, common in pasted text.
  0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069,
]);
/** Hyphen variants Word inserts (non-breaking hyphen and kin). */
const HYPHENS = new Set([0x2010, 0x2011, 0x2012]);
/** Space variants and line breaks inside a field. */
const SPACES = new Set([0x09, 0x0a, 0x0d, 0xa0, 0x2007, 0x202f, 0x2028, 0x2029]);

/**
 * Pasted text carries characters the page shows but the font lacks. The
 * invisible ones are dropped, hyphen and space variants become their plain
 * forms, and anything else becomes "?" and is recorded in `replaced`. NFC
 * first: "e" + combining acute is the "é" the font has.
 */
export function makeSanitizer(known: Set<number>, replaced?: Set<string>) {
  return (s: string): string =>
    Array.from(s.normalize('NFC'))
      .map((ch) => {
        const cp = ch.codePointAt(0)!;
        if (SPACES.has(cp)) return ' ';
        if (INVISIBLE.has(cp) || cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) return '';
        if (HYPHENS.has(cp)) return '-';
        if (known.has(cp)) return ch;
        replaced?.add(ch);
        return '?';
      })
      .join('')
      // The page collapses runs of spaces; so does the PDF.
      .replace(/ {2,}/g, ' ');
}
