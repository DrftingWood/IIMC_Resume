import { describe, it, expect } from 'vitest';
import type { PdfLine, TextItem } from '@/lib/pdfExtract';
import { parseResume } from '@/templates/skynet/parser';

/**
 * A crafted PDF could previously drive parseIndustry's contiguous-partition
 * search into tens of millions of branches and hang the tab. Real resumes use
 * at most 3 margin labels over a handful of firms (~20 partitions).
 */
const item = (str: string, x: number, y: number, rotated = false, h = 9.9): TextItem => ({
  str, x, y, width: Math.max(4, str.length * 4), height: h,
  fontName: 'Calibri', rotated,
});
const line = (str: string, x: number, y: number, rotated = false, h = 9.9): PdfLine => ({
  y, startX: x, endX: x + Math.max(4, str.length * 4), height: h,
  items: [item(str, x, y, rotated, h)], text: str,
});

/**
 * Industry section with `firms` date-banner rows and `labels` rotated runs.
 * The labels are deliberately SHORT (narrow span) and placed far below the
 * firm rows, so none of them vertically contains a banner. That forces every
 * block's type to stay unresolved, which is the only condition under which
 * the contiguous-partition search actually runs - a wider label whose span
 * already covers the blocks resolves them directly and skips it entirely.
 */
function craft(firms: number, labels: number): PdfLine[] {
  const lines: PdfLine[] = [
    line('MBA/0001/63', 508, 22),
    line('INDUSTRY EXPERIENCE', 19.5, 40, false, 11.2),
  ];
  let y = 60;
  for (let i = 0; i < firms; i++) {
    lines.push(line(`Firm ${i} Role ${i} Jul\`23-May\`26`, 35, y));
    lines.push(line(`bullet text for firm ${i}`, 113.2, y + 10));
    y += 22;
  }
  // 'X' -> width 4, so spanContains covers only +/-4pt; placed 5000pt away.
  for (let i = 0; i < labels; i++) {
    lines.push(line('X', 19.3, 5000 + i * 50, true));
  }
  return lines;
}

describe('parseIndustry is not exponential on crafted input', () => {
  it('handles a realistic resume shape quickly', () => {
    const t0 = Date.now();
    parseResume(craft(6, 3));
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('refuses to enumerate a combinatorial partition space', () => {
    // 50 firm blocks x 8 labels is C(49,7) = 85,900,584 partitions.
    // Uncapped this ran for over 4 seconds without finishing.
    const t0 = Date.now();
    const { data } = parseResume(craft(50, 8));
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(2000);
    // It must still produce a usable answer, not bail out entirely.
    expect(Array.isArray(data.experience)).toBe(true);
  });

  it('stays fast at the shape that previously took 240ms', () => {
    const t0 = Date.now();
    parseResume(craft(40, 6));
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});
