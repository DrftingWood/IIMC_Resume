import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Layout cannot be asserted in jsdom, so these guard the measured constants
 * themselves. Every value here was derived by rendering a real 63rd-batch
 * resume in a browser and comparing against the same file rendered from its
 * source PDF. Changing one silently changes the exported page, and the last
 * time these were wrong a one-page resume exported as two.
 */
const css = readFileSync(
  resolve(__dirname, '../src/templates/skynet/styles.css'),
  'utf8'
);

describe('skynet print geometry constants', () => {
  it('keeps the corpus-measured row pitch', () => {
    expect(css).toMatch(/--row-pitch:\s*14\.6pt/);
  });

  it('keeps the derived line-height that makes a row measure that pitch', () => {
    // A row is line-height + padding + collapsed borders. 13.4pt measures back
    // to a 14.61pt row; raising it to the pitch itself overflows the page.
    expect(css).toMatch(/--row-line:\s*13\.4pt/);
  });

  it('keeps vertical cell padding at zero', () => {
    // 1pt of padding per cell added ~86pt over 43 rows and pushed the page
    // past A4. Both the shared cell rule and the year cell must stay at zero.
    expect(css).toMatch(/padding:\s*0 3pt/);
    expect(css).toMatch(/padding:\s*0 2pt !important/);
  });

  it('keeps the bullet cell free of horizontal padding', () => {
    // 10pt of padding here narrowed the text column enough to wrap 22 of 43
    // bullets onto a second line.
    expect(css).toMatch(/padding-left:\s*0 !important/);
    expect(css).toMatch(/padding-right:\s*0 !important/);
  });

  it('keeps the letter-spacing that closes the measured text-width gap', () => {
    // Browser text renders ~2.9% wider than the same string in the source PDF.
    expect(css).toMatch(/letter-spacing:\s*-0\.01em/);
  });

  it('keeps the education colgroup derived from measured column centres', () => {
    const preview = readFileSync(
      resolve(__dirname, '../src/templates/skynet/Preview.tsx'),
      'utf8'
    );
    for (const pct of ['33.80%', '46.16%', '13.75%', '6.29%']) {
      expect(preview).toContain(pct);
    }
  });
});
