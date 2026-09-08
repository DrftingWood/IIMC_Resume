import type { PdfLine } from '@/lib/pdfExtract';
import { batchNumberFromLines, templateForBatch } from '@/lib/batch';

const SKYNET_ANCHORS = [
  'ACADEMIC PROFILE',
  'PROJECTS AND PAPERS',
  'ENTREPRENEURIAL/NON-PROFIT VENTURE',
  'POSITION OF RESPONSIBILITY',
];

/** The MBA id is authoritative; header vocabulary is only the tiebreak. */
export function detectSkynet(lines: PdfLine[]): boolean {
  const batch = batchNumberFromLines(lines);
  if (batch !== null) return templateForBatch(batch) === 'skynet';
  const upper = lines.map((l) => l.text.toUpperCase());
  return SKYNET_ANCHORS.some((a) => upper.some((t) => t.includes(a)));
}
