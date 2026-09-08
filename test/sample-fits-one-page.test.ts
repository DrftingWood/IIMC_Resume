import { describe, it, expect } from 'vitest';
import { SAMPLE } from '@/templates/skynet/sample';

/**
 * Layout cannot be measured in jsdom, so this guards the two properties that
 * actually caused the sample to overflow. Measured in a browser against a real
 * 63rd-batch resume: the bullet column fits ~110 characters on one line, and
 * the sample rendered at 1161pt (1.38 A4 pages) with 15 of 26 bullets wrapping
 * — the demo a new user clicks would have exported as two sheets.
 */
const BULLET_CHAR_LIMIT = 110;

function allBullets(): string[] {
  const groups = [
    ...SAMPLE.distinctions,
    ...SAMPLE.projects,
    ...SAMPLE.entrepreneurial,
    ...SAMPLE.extras,
  ];
  return [
    ...groups.flatMap((g) => g.bullets.map((b) => b.text)),
    ...SAMPLE.positions.flatMap((p) => p.bullets),
    ...SAMPLE.experience.flatMap((e) => e.subSections.flatMap((s) => s.bullets)),
  ];
}

describe('the built-in sample fits one page', () => {
  it('keeps every bullet to a single rendered line', () => {
    const tooLong = allBullets()
      .map((t) => t.replace(/\*\*/g, ''))
      .filter((t) => t.length > BULLET_CHAR_LIMIT);
    expect(tooLong).toEqual([]);
  });

  it('does not carry more bullets than a page holds', () => {
    // The app's own guidance ("?" tip) is ~35 bullets across all sections.
    expect(allBullets().length).toBeLessThanOrEqual(32);
  });

  it('still demonstrates every section', () => {
    expect(SAMPLE.education.length).toBeGreaterThan(0);
    expect(SAMPLE.distinctions.length).toBeGreaterThan(0);
    expect(SAMPLE.projects.length).toBeGreaterThan(0);
    expect(SAMPLE.entrepreneurial.length).toBeGreaterThan(0);
    expect(SAMPLE.experience.length).toBeGreaterThan(0);
    expect(SAMPLE.positions.length).toBeGreaterThan(0);
    expect(SAMPLE.extras.length).toBeGreaterThan(0);
    expect(SAMPLE.hiddenSections).toEqual([]);
  });
});
