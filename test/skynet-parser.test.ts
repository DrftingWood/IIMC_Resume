import { describe, it, expect } from 'vitest';
import { loadFixture } from './support/pdf';
import { parseResume } from '@/templates/skynet/parser';

const A = () => parseResume(loadFixture('skynet-a')).data;
const B = () => parseResume(loadFixture('skynet-b')).data;

describe('skynet parser: anchors and glyphs', () => {
  it('parses ACADEMIC PROFILE into education rows', () => {
    const edu = A().education!;
    expect(edu.length).toBeGreaterThanOrEqual(4);
    expect(edu.some((r) => /Indian Institute of Technology/i.test(r.institute))).toBe(true);
    expect(edu.every((r) => r.year !== '')).toBe(true);
  });

  it('parses the singular POSITION OF RESPONSIBILITY header', () => {
    expect(B().positions!.length).toBeGreaterThan(0);
  });

  it('strips the U+25A0 bullet glyph from every bullet', () => {
    const texts = [
      ...A().distinctions!.flatMap((g) => g.bullets.map((b) => b.text)),
      ...A().extras!.flatMap((g) => g.bullets.map((b) => b.text)),
      ...A().experience!.flatMap((e) => e.subSections.flatMap((s) => s.bullets)),
    ];
    expect(texts.length).toBeGreaterThan(10);
    for (const t of texts) expect(t).not.toMatch(/[■▪•]/);
  });

  it('reports no failed sections', () => {
    expect(parseResume(loadFixture('skynet-a')).failedSections).toEqual([]);
  });
});

describe('skynet parser: industry column regime', () => {
  it('does not truncate industry bullets (full-width regime)', () => {
    // Industry Experience has no year column; bullets run the full width.
    // With finite yearX, far-right items (like "mines" at x~550) get clipped
    // into the right column, truncating the bullet text. This test verifies
    // that does not happen by asserting specific multi-word patterns that span
    // from low-x to high-x within a single bullet.
    const bullets = parseResume(loadFixture('skynet-a')).data
      .experience!.flatMap((e) => e.subSections.flatMap((s) => s.bullets));
    expect(bullets.length).toBeGreaterThan(5);

    // The critical test case: this bullet spans from low-x items ("dept. of Environment
    // Management in") to high-x items ("mines" at ~x550). If yearX were ~547, the
    // mid-column would end before x550, and "mines" would be cut into the right
    // column (year column), making the bullet end at "in 3".
    const envBullet = bullets.find((t) => /Environment Management/.test(t));
    expect(envBullet).toBeDefined();
    expect(envBullet).toMatch(/Environment Management/);
    // Strip markdown bold markers for comparison
    const clean = envBullet!.replace(/\*\*(.+?)\*\*/g, '$1');
    expect(clean).toMatch(/Environment Management[\s\S]*mines/i);
    // Explicit check: must not end at "in 3" when "mines" follows
    expect(clean).not.toMatch(/in\s+3\s*$/i);
  });

  it('keeps the months banner off the bullets', () => {
    const data = parseResume(loadFixture('skynet-a')).data;
    expect(data.industryRightText).toMatch(/^\d+ MONTHS \(FULL-TIME\)$/);
  });
});
