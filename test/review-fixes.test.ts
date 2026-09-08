import { describe, it, expect } from 'vitest';
import type { PdfLine } from '@/lib/pdfExtract';
import { batchNumberFromLines, chooseTemplate } from '@/lib/batch';
import { TEMPLATES } from '@/templates/registry';
import { parseResume as parseSkynet } from '@/templates/skynet/parser';
import { migrateBetweenBatches } from '@/lib/migrateBatch';
import { SAMPLE as SUPERSET_SAMPLE } from '@/templates/superset/sample';

/** Minimal PdfLine, enough for anchor/id scanning. */
const line = (text: string, y = 100, height = 11.2): PdfLine => ({
  y, startX: 19.5, endX: 500, height, text,
  items: [{ str: text, x: 19.5, y, width: 200, height, fontName: 'Calibri-Bold', rotated: false }],
});

describe('id regex is guarded against digit bleed-over', () => {
  it('reads a clean id', () => {
    expect(batchNumberFromLines([line('MBA/0002/63')])).toBe(63);
  });

  it('refuses a bled id rather than reading a wrong batch', () => {
    // groupIntoLines omits the space when the x-gap is under ~1.5pt, so a
    // neighbouring digit run can abut the id. Reading 6334 here would select
    // Skynet for what may be a Superset resume, silently emptying it.
    expect(batchNumberFromLines([line('MBA/0002/6334')])).toBeNull();
  });

  it('still accepts a plausible three-digit future batch', () => {
    expect(batchNumberFromLines([line('MBA/0002/100')])).toBe(100);
  });
});

describe('id is not trusted when the layout contradicts it', () => {
  const supersetLayout = [
    line('MBA/0002/63'),                            // id says Skynet
    line('ACADEMIC QUALIFICATIONS'),                // layout says Superset
    line('POSITIONS OF RESPONSIBILITY'),
    line('EXTRA-CURRICULAR ACHIEVEMENTS'),
    line('INDUSTRY EXPERIENCE'),
  ];

  it('falls through to the chooser instead of guessing', () => {
    expect(chooseTemplate(supersetLayout, TEMPLATES)).toBeUndefined();
  });

  it('still honours the id when the layout agrees', () => {
    const agreeing = [line('MBA/0002/63'), line('ACADEMIC PROFILE'), line('PROJECTS AND PAPERS')];
    expect(chooseTemplate(agreeing, TEMPLATES)?.id).toBe('skynet');
  });
});

describe('a document with no recognisable sections fails loudly', () => {
  it('reports a document-level failure rather than an empty success', () => {
    const nothing = [line('Some Unrelated Document'), line('No anchors here at all')];
    const { failedSections } = parseSkynet(nothing);
    expect(failedSections).toContain('document');
  });
});

describe('migration hides every empty section, not just the Skynet-only pair', () => {
  it('hides a section that arrives empty so no bare bar prints', () => {
    const noPositions = { ...SUPERSET_SAMPLE, positions: [] };
    const { data } = migrateBetweenBatches('superset', 'skynet', noPositions) as never as {
      data: { hiddenSections: string[]; positions: unknown[] };
    };
    expect(data.positions).toEqual([]);
    expect(data.hiddenSections).toContain('positions');
  });
});
