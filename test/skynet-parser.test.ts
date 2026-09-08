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
  it('does not truncate industry bullets', () => {
    const bullets = parseResume(loadFixture('skynet-a')).data
      .experience!.flatMap((e) => e.subSections.flatMap((s) => s.bullets));
    expect(bullets.length).toBeGreaterThan(5);
    // The known-truncated bullet: "...Environment Management in 3 mines".
    const b = bullets.find((t) => /Environment Management/.test(t));
    expect(b).toBeDefined();
    expect(b).toMatch(/mines/);
  });

  it('keeps the months banner off the bullets', () => {
    const data = parseResume(loadFixture('skynet-a')).data;
    expect(data.industryRightText).toMatch(/^\d+ MONTHS \(FULL-TIME\)$/);
  });
});
