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

  it('keeps the bullet cell insets that place the glyph where the PDF does', () => {
    // The cell's left gridline is the measured x=100.60 and the source PDF
    // puts the bullet glyph at 108.4pt, so 7.8pt of left padding reproduces
    // that. 3pt on the right keeps text off the year column rule. The original
    // 10pt of padding wrapped 22 of 43 bullets; dropping it to zero fitted the
    // page but left every bullet touching its border - these do both.
    expect(css).toMatch(/padding-left:\s*7\.8pt !important/);
    expect(css).toMatch(/padding-right:\s*3pt !important/);
  });

  it('keeps the bullet-table columns on the corpus gridlines', () => {
    const preview = readFileSync(
      resolve(__dirname, '../src/templates/skynet/Preview.tsx'),
      'utf8'
    );
    // Category to x=100.60, bullet to x=548.13, year to the content edge at
    // x=578.9, over a 562.8pt content width - all measured gridline centres.
    // A 7% year column stole the width the bullet text needed and pushed it
    // against the gridline.
    for (const pct of ['15.01%', '79.52%', '5.47%']) {
      expect(preview).toContain(pct);
    }
  });

  it('does not uppercase text the source template leaves in title case', () => {
    // The firm banner prints "Tata Steel Limited" / "Manager Environment" as
    // the student typed them, and the months banner "34 Months (FULL-TIME)".
    expect(css).not.toMatch(/\.sk-firm-banner\s*\{[^}]*text-transform:\s*uppercase/s);
    const parser = readFileSync(
      resolve(__dirname, '../src/templates/skynet/parser.ts'),
      'utf8'
    );
    expect(parser).not.toMatch(/rightText = monthsMatch\[1\]\.toUpperCase\(\)/);
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
    // Boundaries measured at x=213.20 / 466.10 / 550.40 inside the
    // 16.1-578.9pt content box. Cross-check: they put the column centres at
    // 114.65 / 339.65 / 508.25 / 564.65, matching the measured header text
    // centres (114.6 / 339.6 / 508.2 / 564.6) to 0.05pt.
    for (const pct of ['35.02%', '44.94%', '14.98%', '5.06%']) {
      expect(preview).toContain(pct);
    }
  });

  it('keeps the header type sizes measured from the source PDF', () => {
    // Verified by printing a real 63rd-batch resume to PDF and comparing spans
    // against the original: the candidate name is 12pt and the tagline cells
    // 11.25pt. 14.5pt/10.25pt rendered the name oversized and the taglines
    // undersized, and the taller header pushed every section below it down
    // ~18pt.
    expect(css).toMatch(/font-size:\s*12pt/);
    expect(css).toMatch(/font-size:\s*11\.25pt/);
  });

  it('keeps the page top padding that puts the name where the source does', () => {
    // The source PDF places the candidate name at y=6.6pt.
    expect(css).toMatch(/padding:\s*6pt var\(--hdr-x-right\)/);
  });

  it('keeps the content box symmetric on the measured outer gridlines', () => {
    // The outer frame is a 0.75pt rule spanning 15.75-16.50 on the left and
    // 578.50-579.25 on the right, so its centres are 16.125 / 578.875 - a
    // symmetric 16.1pt margin, 562.8pt of content. The earlier 19.5pt/12.7pt
    // asymmetry sat every table 3.4pt too far right.
    expect(css).toMatch(/--hdr-x:\s*16\.1pt/);
    expect(css).toMatch(/--hdr-x-right:\s*16\.1pt/);
  });

  it('does not outdent the section bar past the table edges', () => {
    // In the source the dark bars and the table gridlines share their edges,
    // which is what makes the document read as one block. Negative margins
    // here make the bar wider than the tables and it visibly protrudes.
    const bar = css.match(/\.sk-section-bar\s*\{[^}]*\}/s);
    expect(bar).not.toBeNull();
    expect(bar![0]).not.toMatch(/margin-left|margin-right|margin:/);
    expect(bar![0]).toMatch(/padding:\s*1pt 3\.4pt/);
  });

  it('keeps the industry margin-label column on its measured gridline', () => {
    // The rotated-label column runs from the content edge (16.1pt) to the
    // measured gridline at x=30.40 - 14.3pt, not a round 0.45cm.
    expect(css).toMatch(/width:\s*14\.3pt/);
  });
});
