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
  it('keeps the measured row pitch', () => {
    expect(css).toMatch(/--row-pitch:\s*14\.6pt/);
  });

  it('keeps the derived line-height that makes a row measure that pitch', () => {
    // Recalibrated against a 62nd-batch reference PDF and checked on 20 real
    // resumes (exported PDF vs original, word by word): 14.3pt with 0.75pt
    // black rules puts text within ~1-3pt of the original down the page.
    // 13.4pt left every section short and a ~16-38pt blank band at the bottom.
    expect(css).toMatch(/--row-line:\s*14\.3pt/);
  });

  it('keeps vertical cell padding at zero', () => {
    // 1pt of padding per cell added ~86pt over 43 rows and pushed the page
    // past A4. Both the shared cell rule and the year cell must stay at zero.
    expect(css).toMatch(/padding:\s*0 3pt/);
    expect(css).toMatch(/padding:\s*0 2pt !important/);
  });

  it('keeps the bullet cell insets that place the text where the PDF does', () => {
    // Text starts at x=113.18pt in the official PDF (measured in the browser:
    // 11.98pt of padding lands it there). The bullet square sits in that
    // padding with zero advance; as an inline glyph with a margin it pushed
    // the text to 117.4pt and lines wrapped that fit in the PDF. On the right,
    // students fill lines to the year-column gridline, so 0.3pt is all the
    // inset there is room for.
    expect(css).toMatch(/padding-left:\s*11\.98pt !important/);
    expect(css).toMatch(/padding-right:\s*0\.3pt !important/);
    const before = css.match(/\.sk-bullet::before\s*\{[^}]*\}/s)![0];
    expect(before).toMatch(/width:\s*2\.58pt/);
    expect(before).toMatch(/vertical-align:\s*2\.13pt/);
  });

  it('keeps the bullet-table columns on the measured gridlines', () => {
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

  it('typesets points exactly as the PDF writer does', () => {
    // No kerning, no ligatures (as Word), no letter-spacing on points, and the
    // template's 0.15pt on Industry text: preview line widths then match the
    // exported PDF to ~0.05%, so both wrap in the same places.
    expect(css).toMatch(/font-kerning:\s*none/);
    expect(css).toMatch(/font-variant-ligatures:\s*none/);
    expect(css).toMatch(/\.sk-industry \.sk-bullet-cell\s*\{[^}]*letter-spacing:\s*0\.15pt/s);
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
    // 16.12pt, measured rule to rule in the reference PDF; a minimum so a long
    // renamed title grows the bar instead of spilling onto the rows around it.
    expect(bar![0]).toMatch(/min-height:\s*16\.12pt/);
  });

  it('keeps the industry margin-label column on its measured gridline', () => {
    // The rotated-label column runs from the content edge (16.1pt) to the
    // measured gridline at x=30.40 - 14.3pt, not a round 0.45cm.
    expect(css).toMatch(/width:\s*14\.3pt/);
  });
});
