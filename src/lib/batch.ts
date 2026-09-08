import type { PdfLine } from './pdfExtract';
import type { AnyTemplateConfig, TemplateKey } from '@/templates/types';

const MBA_ID_RE = /MBA\/\d+\/(\d+)/;

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
    return templates.find((t) => t.id === templateForBatch(batch));
  }
  const matches = templates.filter((t) => t.detect?.(lines));
  return matches.length === 1 ? matches[0] : undefined;
}
