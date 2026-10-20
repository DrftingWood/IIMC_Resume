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
    // 40px wrapped + 8px slack on line one, at ~4px a character.
    expect(r.overflowChars).toBe(12);
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

  it('counts characters without the bold markers', () => {
    expect(visibleLength('a **bold** word')).toBe('a bold word'.length);
  });
});

describe('meter text', () => {
  it('shows fill and characters left', () => {
    render(<FillText report={{ lines: 1, fill: 0.9, charsLeft: 10, overflowChars: 0 }} />);
    expect(screen.getByRole('status').textContent).toContain('90% full · about 10 characters left');
  });

  it('calls a full line full', () => {
    render(<FillText report={{ lines: 1, fill: 0.99, charsLeft: 1, overflowChars: 0 }} />);
    expect(screen.getByRole('status').textContent).toContain('99% full · full');
  });

  it('warns when a point wraps', () => {
    render(<FillText report={{ lines: 2, fill: 1, charsLeft: 0, overflowChars: 12 }} />);
    expect(screen.getByRole('status').textContent).toBe(
      'Wraps onto 2 lines · cut about 12 characters to fit one line'
    );
  });
});
