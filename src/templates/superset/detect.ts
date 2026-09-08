import type { PdfLine } from '@/lib/pdfExtract';
import { batchNumberFromLines, templateForBatch } from '@/lib/batch';

const IIMC_ANCHORS = [
  'ACADEMIC QUALIFICATIONS',
  'ACADEMIC DISTINCTIONS',
  'INDUSTRY EXPERIENCE',
  'POSITIONS OF RESPONSIBILITY',
  'EXTRA-CURRICULAR ACHIEVEMENTS',
];

const IIMC_SIGNALS = [
  /MBA\/\d+\/\d+/,
  /Indian Institute of Management Calcutta/i,
];

/** The MBA id is authoritative; header vocabulary is only the tiebreak.
 *  Heuristic fallback: the PDF is an IIMC placement resume if ≥3 of the 5
 *  canonical section headers appear, OR a strong identifier (MBA id /
 *  institute name) plus ≥2 anchors. */
export function detectSupersetLayout(lines: PdfLine[]): boolean {
  const upper = lines.map((l) => l.text.toUpperCase());
  const anchorHits = IIMC_ANCHORS.filter((a) =>
    upper.some((t) => t.includes(a))
  ).length;
  if (anchorHits >= 3) return true;
  const strongSignal = IIMC_SIGNALS.some((re) =>
    lines.some((l) => re.test(l.text))
  );
  return strongSignal && anchorHits >= 2;
}

/** The MBA id is authoritative; header vocabulary is only the tiebreak. */
export function detectSuperset(lines: PdfLine[]): boolean {
  const batch = batchNumberFromLines(lines);
  if (batch !== null) return templateForBatch(batch) === 'superset';
  return detectSupersetLayout(lines);
}
