import type { PdfLine } from '@/lib/pdfExtract';

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

/** Heuristic: the PDF is an IIMC placement resume if ≥3 of the 5 canonical
 *  section headers appear, OR a strong identifier (MBA id / institute name)
 *  plus ≥2 anchors. */
export function detectSkynet(lines: PdfLine[]): boolean {
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
