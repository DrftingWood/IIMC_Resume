import { describe, it, expect } from 'vitest';
import { loadFixture } from './support/pdf';
import { batchNumberFromLines, templateForBatch, chooseTemplate } from '@/lib/batch';
import { detectSkynet } from '@/templates/skynet/detect';
import { detectSuperset } from '@/templates/superset/detect';
import { TEMPLATES } from '@/templates/registry';
import type { PdfLine } from '@/lib/pdfExtract';

/** Minimal PdfLine stand-ins — only `.text` matters to the detectors. */
function makeLines(texts: string[]): PdfLine[] {
  return texts.map((text) => ({ y: 0, startX: 0, endX: 0, height: 0, items: [], text }));
}

describe('batch detection', () => {
  it('reads the batch number from the MBA id', () => {
    expect(batchNumberFromLines(loadFixture('skynet-a'))).toBe(63);
    expect(batchNumberFromLines(loadFixture('superset-a'))).toBe(61);
  });

  it('maps batch numbers to templates at the 62 boundary', () => {
    expect(templateForBatch(61)).toBe('superset');
    expect(templateForBatch(62)).toBe('skynet');
    expect(templateForBatch(63)).toBe('skynet');
    expect(templateForBatch(58)).toBe('superset');
  });

  it('returns null when no MBA id is present', () => {
    expect(batchNumberFromLines([])).toBeNull();
  });

  it('detectors agree with the batch id', () => {
    for (const [f, expected] of [['skynet-a', true], ['superset-a', false]] as const) {
      expect(detectSkynet(loadFixture(f))).toBe(expected);
      expect(detectSuperset(loadFixture(f))).toBe(!expected);
    }
  });

  it('does not silently pick a template when both detectors claim a file with no MBA id', () => {
    // No MBA id anywhere, but header vocabulary from BOTH formats: enough
    // Superset anchors to clear its 3-of-5 threshold, plus one Skynet-only
    // anchor. This is the reachable case where the two fallback heuristics
    // are not mutually exclusive.
    const mixedLines = makeLines([
      'ACADEMIC QUALIFICATIONS',
      'INDUSTRY EXPERIENCE',
      'EXTRA-CURRICULAR ACHIEVEMENTS',
      'PROJECTS AND PAPERS',
    ]);

    expect(batchNumberFromLines(mixedLines)).toBeNull();
    expect(detectSuperset(mixedLines)).toBe(true);
    expect(detectSkynet(mixedLines)).toBe(true);

    // Both templates claim it, so the selector must refuse to guess.
    expect(chooseTemplate(mixedLines, TEMPLATES)).toBeUndefined();
  });
});
