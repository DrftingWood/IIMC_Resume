import { describe, it, expect } from 'vitest';
import type { PdfLine, TextItem } from '@/lib/pdfExtract';
import { parseResume } from '@/templates/skynet/parser';
import { loadFixture } from './support/pdf';

const item = (str: string, x: number, y: number, h = 9.9): TextItem => ({
  str, x, y, width: Math.max(4, str.length * 4), height: h, fontName: 'Calibri', rotated: false,
});
const line = (str: string, x: number, y: number, h = 9.9): PdfLine => ({
  y, startX: x, endX: x + Math.max(4, str.length * 4), height: h,
  items: [item(str, x, y, h)], text: str,
});

describe('a section header with nothing under it is reported, not silently dropped', () => {
  it('names the section whose content failed to parse', () => {
    // POSITION OF RESPONSIBILITY is present as a real 11.2pt header, but the
    // section body is empty. Previously this produced failedSections: [] and
    // the student landed in the editor with the section simply missing.
    const lines = [
      line('MBA/0001/63', 508, 22, 12),
      line('ACADEMIC PROFILE', 19.5, 60, 11.2),
      line('B.Tech Engineering', 42, 80),
      line('Some Institute', 262, 80),
      line('9/10', 492, 80),
      line('2023', 554, 80),
      line('POSITION OF RESPONSIBILITY', 19.5, 120, 11.2),
      line('EXTRA-CURRICULAR ACHIEVEMENTS', 19.5, 160, 11.2),
    ];
    const { failedSections } = parseResume(lines);
    expect(failedSections).toContain('Position of Responsibility');
    expect(failedSections).toContain('Extra-Curricular Achievements');
  });

  it('stays silent for a section the document never had', () => {
    const lines = [
      line('MBA/0001/63', 508, 22, 12),
      line('ACADEMIC PROFILE', 19.5, 60, 11.2),
      line('B.Tech Engineering', 42, 80),
      line('Some Institute', 262, 80),
      line('9/10', 492, 80),
      line('2023', 554, 80),
    ];
    const { failedSections } = parseResume(lines);
    // Projects is absent, not broken - it is hidden, not reported.
    expect(failedSections).not.toContain('Projects and Papers');
  });

  it('does not fire on a real resume that parses correctly', () => {
    for (const f of ['skynet-a', 'skynet-b', 'skynet-c', 'skynet-d']) {
      expect(parseResume(loadFixture(f)).failedSections).toEqual([]);
    }
  });
});
