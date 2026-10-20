import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { analyseFill, pointHtml, visibleLength } from '@/lib/lineFill';
import { FillText } from '@/components/LineFill';

// A 400px-wide line from x=100 to x=500; ~4px per character.
const L = 100;
const R = 500;

describe('analyseFill', () => {
  it('reports how full a one-line point is and what still fits', () => {
    const r = analyseFill([{ left: 100, right: 460, top: 10 }], L, R, 90)!;
    expect(r.lines).toBe(1);
    expect(r.fill).toBeCloseTo(0.9);
    expect(r.charsLeft).toBe(10);
    expect(r.overflowChars).toBe(0);
  });

  it('merges boxes that share a line, such as around a bold run', () => {
    const r = analyseFill(
      [
        { left: 100, right: 200, top: 10 },
        { left: 200, right: 300, top: 10.5 },
      ],
      L,
      R,
      50
    )!;
    expect(r.lines).toBe(1);
    expect(r.fill).toBeCloseTo(0.5);
  });

  it('says how much to cut when a point wraps', () => {
    const r = analyseFill(
      [
        { left: 100, right: 492, top: 10 },
        { left: 100, right: 140, top: 25 },
      ],
      L,
      R,
      108
    )!;
    expect(r.lines).toBe(2);
    expect(r.charsLeft).toBe(0);
    // 40px wrapped, minus the 8px still free on line one, at ~4px a character.
    expect(r.overflowChars).toBe(8);
    expect(r.unbreakable).toBeUndefined();
  });

  it('spots one word wider than the line instead of inventing a count', () => {
    // Line one holds only the bullet; the long URL went to line two and beyond.
    const r = analyseFill(
      [
        { left: 100, right: 108, top: 10 },
        { left: 100, right: 500, top: 25 },
        { left: 100, right: 300, top: 40 },
      ],
      L,
      R,
      114
    )!;
    expect(r.unbreakable).toBe(true);
    expect(r.overflowChars).toBeLessThanOrEqual(114);
  });

  it('gives up on nothing to measure', () => {
    expect(analyseFill([], L, R, 10)).toBeNull();
    expect(analyseFill([{ left: 1, right: 2, top: 0 }], 5, 5, 10)).toBeNull();
    expect(analyseFill([{ left: 1, right: 2, top: 0 }], L, R, 0)).toBeNull();
  });
});

describe('probe markup', () => {
  it('matches what the page renders: bold runs and superscript ordinals', () => {
    expect(pointHtml('Ranked **1st** of 300 in the 2nd round')).toBe(
      'Ranked <strong>1<sup>st</sup></strong> of 300 in the 2<sup>nd</sup> round'
    );
  });

  it('cannot inject markup from a point', () => {
    expect(pointHtml('<img src=x onerror=alert(1)> & co')).toBe(
      '&lt;img src=x onerror=alert(1)&gt; &amp; co'
    );
  });

  it('counts characters as a reader does', () => {
    expect(visibleLength('a **bold** word')).toBe('a bold word'.length);
    expect(visibleLength('  padded  ')).toBe(6);
    expect(visibleLength('Won 🏆')).toBe(5);
    expect(visibleLength('हिंदी')).toBe(2); // हिं + दी
  });
});

describe('meter text', () => {
  it('says how many characters are to spare', () => {
    const { container } = render(<FillText report={{ lines: 1, fill: 0.9, charsLeft: 10, overflowChars: 0 }} />);
    expect(container.textContent).toBe('10 characters to spare');
  });

  it('calls a full line full', () => {
    const { container } = render(<FillText report={{ lines: 1, fill: 0.99, charsLeft: 1, overflowChars: 0 }} />);
    expect(container.textContent).toBe('Fills the line');
  });

  it('warns in red when a point wraps', () => {
    const { container } = render(<FillText report={{ lines: 2, fill: 1, charsLeft: 0, overflowChars: 12 }} />);
    expect(container.textContent).toBe('Runs onto 2 lines · cut about 12 characters');
    expect(container.querySelector('[data-fill="wraps"]')!.className).toMatch(/text-red-700/);
  });

  it('names a too-long single word rather than a character count', () => {
    const { container } = render(
      <FillText report={{ lines: 3, fill: 1, charsLeft: 0, overflowChars: 114, unbreakable: true }} />
    );
    expect(container.textContent).toBe('One word is wider than the line');
  });

  it('is not a live region, so screen readers are not flooded while typing', () => {
    const { container } = render(<FillText report={{ lines: 1, fill: 0.5, charsLeft: 40, overflowChars: 0 }} />);
    expect(container.querySelector('[role="status"], [aria-live]')).toBeNull();
  });
});
