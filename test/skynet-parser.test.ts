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

describe('skynet parser: rotated margin labels', () => {
  // The three margin labels the Industry Experience column can carry. A
  // "leaked" label means a subSection's whole label IS one of these, not
  // that it merely contains one as a substring — an unanchored regex here
  // false-positives on legitimate labels like "International", "Internship"
  // and "Research Intern" (matches test/corpus.test.ts's MARGIN_LABELS
  // exact-match check).
  const MARGIN_LABELS = new Set(['Full Time', 'Intern', 'Others']);

  it('never leaks a margin label into a sub-section label', () => {
    let inspected = 0;
    for (const f of ['skynet-a', 'skynet-b', 'skynet-c', 'skynet-d']) {
      const labels = parseResume(loadFixture(f)).data
        .experience!.flatMap((e) => e.subSections.map((s) => s.label));
      inspected += labels.length;
      for (const l of labels) {
        expect(MARGIN_LABELS.has(l.trim())).toBe(false);
      }
    }
    // Guard against the assertion above being vacuous: if `experience` ever
    // regresses to an empty array, the loops above run zero times and the
    // test passes trivially without checking anything. Fail loudly instead.
    expect(inspected).toBeGreaterThan(10);
  });

  it('assigns each experience entry a margin type', () => {
    const types = parseResume(loadFixture('skynet-a')).data.experience!.map((e) => e.type);
    expect(types.length).toBeGreaterThan(0);
    for (const t of types) expect(['Full Time', 'Intern', 'Others']).toContain(t);
  });

  it('assigns the correct margin type per firm on a multi-group resume', () => {
    // skynet-d (MBA/9005/63, source corpus-resume-D.pdf) has BOTH a
    // "Full Time" and an "Intern" rotated margin label, with two firms under
    // "Intern" — the case a naive nearest-single-anchor gets wrong (see the
    // long comment in parseIndustry). Ground truth below was read directly
    // off a rendered image of the source PDF page (not derived from this
    // parser's own output): the "Full Time" bracket covers only ZS
    // Associates; the "Intern" bracket covers both ADM Group ("Senior
    // Executive Intern" — note the role title itself contains the word
    // "Intern", which is exactly why this must be decided structurally and
    // not by text) and Jayesh P Desai & Co.
    const entries = parseResume(loadFixture('skynet-d')).data.experience!;
    const byFirm = Object.fromEntries(entries.map((e) => [e.firm, e.type]));
    expect(byFirm['ZS Associates']).toBe('Full Time');
    expect(byFirm['ADM Group']).toBe('Intern');
    expect(byFirm['Jayesh P Desai & Co.']).toBe('Intern');
  });
});

describe('skynet parser: education table', () => {
  it('reads all four columns for every row', () => {
    // Academic Profile table lists pre-MBA qualifications only, so row counts
    // vary by candidate background: a=5 (CFA+degree+minor+school), b=3 (no extras),
    // c=4, d=3. Exact counts guard against both dropped and spurious rows (e.g. header leak).
    const expected = { 'skynet-a': 5, 'skynet-b': 3, 'skynet-c': 4, 'skynet-d': 3 };
    for (const f of ['skynet-a', 'skynet-b', 'skynet-c', 'skynet-d']) {
      const rows = parseResume(loadFixture(f)).data.education!;
      expect(rows.length).toBe(expected[f as keyof typeof expected]);
      for (const r of rows) {
        expect(r.degree).not.toBe('');
        expect(r.institute).not.toBe('');
        expect(r.gpa).not.toBe('');
        expect(r.year).toMatch(/^(19|20)\d{2}$|^Passed$/);
      }
    }
  });

  it('does not emit a rank column', () => {
    const rows = parseResume(loadFixture('skynet-a')).data.education!;
    for (const r of rows) expect(r).not.toHaveProperty('rank');
  });

  it('excludes the column header row from the data', () => {
    const rows = parseResume(loadFixture('skynet-a')).data.education!;
    expect(rows.some((r) => /Degree\/Exam/.test(r.degree))).toBe(false);
  });
});

describe('skynet parser: optional sections', () => {
  it('parses ENTREPRENEURIAL/NON-PROFIT VENTURE as a bullet table', () => {
    const ent = parseResume(loadFixture('skynet-a')).data.entrepreneurial!;
    expect(ent.length).toBeGreaterThan(0);
    expect(ent[0].bullets.length).toBeGreaterThan(0);
    expect(ent[0].bullets[0].year).toMatch(/\d/);
  });

  it('parses PROJECTS AND PAPERS as a bullet table', () => {
    const proj = parseResume(loadFixture('skynet-c')).data.projects!;
    expect(proj.length).toBeGreaterThan(0);
    expect(proj[0].bullets.length).toBeGreaterThan(0);
    expect(proj[0].bullets[0].year).toMatch(/\d/);
  });

  it('reports section order as it appears in the document', () => {
    // skynet-c places Projects before Industry — real document content.
    const orderC = parseResume(loadFixture('skynet-c')).data.sectionOrder!;
    expect(orderC.indexOf('projects')).toBeLessThan(orderC.indexOf('industry'));

    // skynet-a places Industry Experience BEFORE Entrepreneurial in the
    // document, the opposite of DEFAULT_SECTION_ORDER. This assertion
    // therefore fails if sectionOrder is ever hardcoded again.
    const order = parseResume(loadFixture('skynet-a')).data.sectionOrder!;
    expect(order.indexOf('industry')).toBeLessThan(order.indexOf('entrepreneurial'));
  });

  it('hides sections the source document does not contain', () => {
    // skynet-a has no Projects and no Position of Responsibility.
    const hidden = parseResume(loadFixture('skynet-a')).data.hiddenSections!;
    expect(hidden).toContain('projects');
    expect(hidden).toContain('positions');
    expect(hidden).not.toContain('education');
  });
});
