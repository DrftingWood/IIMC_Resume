import type { PdfLine } from './pdfExtract';
import type { TemplateKey } from '@/templates/types';

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
