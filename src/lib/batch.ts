import type { PdfLine } from './pdfExtract';
import type { AnyTemplateConfig, TemplateKey } from '@/templates/types';

/* Digit-guarded on both sides. `groupIntoLines` only inserts a space when the
   x-gap exceeds ~1.5pt, so a neighbouring digit run can abut the id and turn
   `MBA/0002/63` into `MBA/0002/6334` — which would read as batch 6334 and
   silently select the wrong parser. scripts/make-fixture.mjs hit exactly this.
   The batch group is bounded to 2-3 digits rather than `\d+`: a greedy `\d+`
   swallows the bled digits and makes the trailing `(?!\d)` a no-op, since the
   quantifier has already consumed every digit before the lookahead is tested.
   With {2,3} the engine backtracks, fails the lookahead at every width, and
   returns null — so an ambiguous id falls through to layout detection instead
   of confidently selecting the wrong parser. */
const MBA_ID_RE = /(?<!\d)MBA\/\d+\/(\d{2,3})(?!\d)/;

/** The trailing number of the MBA id is the batch, e.g. MBA/0002/63 -> 63. */
export function batchNumberFromLines(lines: PdfLine[]): number | null {
  for (const l of lines) {
    const m = l.text.match(MBA_ID_RE);
    if (m) return Number(m[1]);
  }
  return null;
}

/** The 62nd batch is the first to use the Skynet format. */
export const SKYNET_FIRST_BATCH = 62;

export function templateForBatch(batch: number): TemplateKey {
  return batch >= SKYNET_FIRST_BATCH ? 'skynet' : 'superset';
}

/**
 * Pick which registered template should handle an uploaded PDF.
 *
 * The MBA id is authoritative and resolves deterministically. With no id,
 * the per-template `detect` heuristics are independent phrase-matchers and
 * can both fire (or neither) — auto-pick only when exactly one template
 * claims the file, otherwise return `undefined` so the caller can ask
 * rather than silently guess wrong.
 */
export function chooseTemplate(
  lines: PdfLine[],
  templates: AnyTemplateConfig[]
): AnyTemplateConfig | undefined {
  const batch = batchNumberFromLines(lines);
  if (batch !== null) {
    const byId = templates.find((t) => t.id === templateForBatch(batch));
    // The id is authoritative only while the document's LAYOUT agrees with it.
    // A student on a transitional or hand-edited template can carry an id whose
    // batch implies the other format; parsing with the wrong one yields an empty
    // resume and reports no failure at all, so ask rather than guess wrong.
    if (byId?.detectLayout && !byId.detectLayout(lines)) {
      const contradicts = templates.some(
        (t) => t !== byId && t.detectLayout?.(lines)
      );
      if (contradicts) return undefined;
    }
    return byId;
  }
  const matches = templates.filter((t) => t.detect?.(lines));
  return matches.length === 1 ? matches[0] : undefined;
}
