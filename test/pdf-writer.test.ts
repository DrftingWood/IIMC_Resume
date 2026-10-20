import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { buildSkynetPdf, PageOverflowError, uriLiteral, type PdfAssets } from '@/pdf/skynetPdf';
import { hydrateSkynet } from '@/templates/skynet/hydrate';
import { layoutSkynet, inlineRuns, type Measure, type Op } from '@/pdf/skynetLayout';
import { pdfFileName } from '@/pdf/exportPdf';
import { FEATURES } from '@/pdf/text';
import fontkit from '@pdf-lib/fontkit';
import { SAMPLE } from '@/templates/skynet/sample';
import type { SkynetResumeData } from '@/templates/skynet/types';

/* The writer draws the official template's measured geometry. These pin the
   numbers that took real PDFs to find, and the failure modes found by
   red-teaming it. Synthetic data only. */

const pub = (p: string) => new Uint8Array(readFileSync(resolve(__dirname, '../public/pdf', p)));
let assets: PdfAssets;
beforeAll(() => {
  assets = { regular: pub('Carlito-Regular.ttf'), bold: pub('Carlito-Bold.ttf'), logo: pub('iimc-logo.png') };
});

/** Deterministic stand-in for font metrics: 0.5em per character. */
const measure: Measure = (t, _f, size) => Array.from(t).length * size * 0.5;
const texts = (ops: Op[]) => ops.filter((o): o is Extract<Op, { kind: 'text' }> => o.kind === 'text');
const clone = (): SkynetResumeData => JSON.parse(JSON.stringify(SAMPLE));

describe('measured geometry', () => {
  const ops = layoutSkynet(SAMPLE, measure).ops;

  it('puts the first section and its first row where the official export does', () => {
    // Frame top rule at y=64.00, bar title baseline 75.91, education header
    // baseline 90.82 - all read from official PDFs.
    // Drawn as a 0.75pt stroke centred on 64.375, like every other rule.
    expect(ops.some((o) => o.kind === 'line' && o.y1 === 64.375 && o.x1 === 15.75 && o.x2 === 579.25)).toBe(true);
    const ys = texts(ops).map((t) => +t.y.toFixed(2));
    expect(ys).toContain(75.91);
    expect(ys).toContain(90.82);
  });

  it('spaces rows 14.625pt apart within a group and 15.375pt across a rule', () => {
    const data = clone();
    data.sectionOrder = ['distinctions'];
    data.distinctions = [
      { category: 'A', bullets: [{ text: 'one', year: '' }, { text: 'two', year: '' }] },
      { category: 'B', bullets: [{ text: 'three', year: '' }] },
    ];
    const t = texts(layoutSkynet(data, measure).ops);
    const y = (s: string) => t.find((o) => o.text === s)!.y;
    expect(y('two') - y('one')).toBeCloseTo(14.625, 3);
    expect(y('three') - y('two')).toBeCloseTo(15.375, 3);
  });

  it('makes a row holding a superscript 0.56pt taller, as Word does', () => {
    const data = clone();
    data.sectionOrder = ['distinctions'];
    data.distinctions = [
      { category: 'A', bullets: [{ text: 'came 1st here', year: '' }, { text: 'next', year: '' }] },
    ];
    const t = texts(layoutSkynet(data, measure).ops);
    const y = (s: string) => t.find((o) => o.text.startsWith(s))!.y;
    expect(y('next') - y('came')).toBeCloseTo(14.625 + 0.56, 3);
  });
});

describe('name and MBA ID position', () => {
  const header = (d: SkynetResumeData, logo = false) =>
    texts(layoutSkynet(d, measure, undefined, { logo }).ops).filter((t) => t.y === 15.6 || t.y === 31.35);

  it('sits on the right edge by default and on the left edge when chosen', () => {
    for (const t of header(SAMPLE)) expect(t.x + measure(t.text, t.font, t.size)).toBeCloseTo(579.25, 2);
    for (const t of header({ ...clone(), nameAlign: 'left' })) expect(t.x).toBe(15.75);
  });

  it('mirrors the logo to the right when the name is on the left', () => {
    const d = { ...clone(), nameAlign: 'left' as const };
    for (const t of header(d, true)) expect(t.x).toBe(15.75);
    const logo = layoutSkynet(d, measure, undefined, { logo: true }).ops.find((o) => o.kind === 'image')!;
    expect(logo.kind === 'image' && logo.x + logo.w).toBeCloseTo(579.25, 2);
  });

  it('keeps only a valid choice from a draft', () => {
    expect(hydrateSkynet({ ...clone(), nameAlign: 'left' }).nameAlign).toBe('left');
    expect(hydrateSkynet({ ...clone(), nameAlign: 'centre' } as never).nameAlign).toBeUndefined();
  });
});

describe('institute logo', () => {
  it('is left out unless the owner switches it on, and nothing else moves', () => {
    const off = layoutSkynet(SAMPLE, measure).ops;
    const on = layoutSkynet(SAMPLE, measure, undefined, { logo: true }).ops;
    expect(off.some((o) => o.kind === 'image')).toBe(false);
    expect(on.filter((o) => o.kind === 'image')).toHaveLength(1);
    expect(on.filter((o) => o.kind !== 'image')).toEqual(off);
  });
});

describe('rule joints', () => {
  type L = Extract<Op, { kind: 'line' }>;
  /** Stubs, gaps and steps: every rule must end within another rule's
      thickness, and rules meeting end to end must share one line. */
  function problems(d: SkynetResumeData): string[] {
    const lines = layoutSkynet(d, measure).ops.filter((o): o is L => o.kind === 'line' && o.color[2] === 0);
    const H = lines.filter((l) => l.y1 === l.y2);
    const V = lines.filter((l) => l.x1 === l.x2);
    const half = 0.375 + 0.02;
    const out: string[] = [];
    for (const v of V) {
      for (const y of [v.y1, v.y2]) {
        const ok = H.some((h) => Math.min(h.x1, h.x2) - half <= v.x1 && v.x1 <= Math.max(h.x1, h.x2) + half && Math.abs(h.y1 - y) <= half);
        if (!ok) out.push(`vertical at x=${v.x1} ends at y=${y} on no rule`);
      }
    }
    for (const h of H) {
      for (const x of [h.x1, h.x2]) {
        const ok = V.some((v) => Math.min(v.y1, v.y2) - half <= h.y1 && h.y1 <= Math.max(v.y1, v.y2) + half && Math.abs(v.x1 - x) <= half);
        if (!ok) out.push(`horizontal at y=${h.y1} ends at x=${x} on no rule`);
      }
    }
    for (const a of H) {
      for (const b of H) {
        const meet = Math.abs(Math.max(a.x1, a.x2) - Math.min(b.x1, b.x2)) < 1.2;
        const dy = Math.abs(a.y1 - b.y1);
        if (meet && dy > 0.02 && dy < 2) out.push(`step between y=${a.y1} and y=${b.y1}`);
      }
    }
    return out;
  }

  it('closes every table cleanly, including the Industry rail', () => {
    expect(problems(SAMPLE)).toEqual([]);
    // Full Time then Intern rail groups, as in a 63rd-batch resume.
    const data = clone();
    data.experience = data.experience.map((e, i) => ({ ...e, type: i === 0 ? 'Full Time' : 'Intern' }));
    expect(problems(data)).toEqual([]);
  });
});

describe('rules', () => {
  it('draws every table rule as a stroke of the same width', () => {
    const ops = layoutSkynet(SAMPLE, measure).ops;
    const lines = ops.filter((o): o is Extract<Op, { kind: 'line' }> => o.kind === 'line');
    // Black lines are all 0.75pt (the blue one is the email underline).
    const black = lines.filter((l) => l.color.every((c) => c === 0));
    expect(new Set(black.map((l) => l.width))).toEqual(new Set([0.75]));
    // No black filled box is thin enough to be a rule.
    const thin = ops.filter(
      (o) => o.kind === 'rect' && o.color.every((c) => c === 0) && (o.h < 1.5 || o.w < 1.5)
    );
    expect(thin).toEqual([]);
  });
});

describe('text never leaves its cell', () => {
  it('shrinks over-long taglines, years and banner text instead of overflowing', () => {
    const data = clone();
    data.taglines = ['X'.repeat(80), 'Y'.repeat(80), 'Z'.repeat(80)];
    data.distinctions[0].bullets[0].year = '2018-2022';
    data.experience[0] = {
      ...data.experience[0],
      firm: 'A VERY LONG FIRM NAME THAT GOES ON AND ON AND ON LIMITED',
      role: 'AN EQUALLY LONG ROLE TITLE FOR THE BANNER ROW HERE',
    };
    for (const t of texts(layoutSkynet(data, measure).ops)) {
      if (t.rotate) continue;
      expect(t.x).toBeGreaterThanOrEqual(15);
      expect(t.x + measure(t.text, t.font, t.size)).toBeLessThanOrEqual(579.3);
    }
  });

  it('cuts any one-line field short rather than let it cross a rule or the page', () => {
    // Every overflow found by red-teaming, at once.
    const data = clone();
    data.name = 'PRIYANKA '.repeat(14);
    data.mbaId = 'MBA/'.repeat(30);
    data.taglines = ['T'.repeat(200), 'U'.repeat(200), 'V'.repeat(200)];
    data.sectionTitles = { distinctions: 'W'.repeat(150) };
    data.industryRightText = 'R'.repeat(120);
    data.distinctions[0].bullets[0].year = 'January 2023 to March 2024 inclusive';
    data.experience[0] = {
      ...data.experience[0],
      type: 'Summer Internship at a Fortune 500 Company',
      firm: 'CENTRE FOR OPERATIONS RESEARCH AND ANALYTICS, NATIONAL INSTITUTE OF TECHNOLOGY TRICHY',
      role: 'UNDERGRADUATE RESEARCH ASSISTANT AND TEACHING ASSISTANT',
      dates: 'January 2021 to May 2022 and again later',
    };
    data.email = 'e'.repeat(200) + '@x.com';
    const ops = texts(layoutSkynet(data, measure).ops);
    for (const t of ops) {
      const w = measure(t.text, t.font, t.size);
      if (t.rotate) continue;
      expect(t.x).toBeGreaterThanOrEqual(15);
      expect(t.x + w).toBeLessThanOrEqual(579.3);
    }
    // Banner pieces never overprint one another.
    const banner = ops
      .filter((t) => !t.rotate && Math.abs(t.y - ops.find((o) => o.text.startsWith('CENTRE'))!.y) < 0.01)
      .sort((a, b) => a.x - b.x);
    for (let i = 1; i < banner.length; i++) {
      const prev = banner[i - 1];
      expect(banner[i].x).toBeGreaterThanOrEqual(prev.x + measure(prev.text, prev.font, prev.size));
    }
  });

  it('pushes the role past a long firm name rather than overlapping it', () => {
    const data = clone();
    data.experience[0] = { ...data.experience[0], firm: 'F'.repeat(60), role: 'Role', dates: 'Jan 24' };
    const t = texts(layoutSkynet(data, measure).ops);
    const firm = t.find((o) => o.text.startsWith('FFFF'))!;
    const role = t.find((o) => o.text === 'Role')!;
    expect(role.x).toBeGreaterThan(firm.x + measure(firm.text, 'bold', firm.size));
  });

  it('breaks a word too long for the line instead of running off the page', () => {
    const data = clone();
    data.distinctions[0].bullets[0].text = 'x'.repeat(200);
    for (const t of texts(layoutSkynet(data, measure).ops)) {
      expect(t.x + measure(t.text, t.font, t.size)).toBeLessThanOrEqual(579.3);
    }
  });

  it('keeps the education year on one line', () => {
    const data = clone();
    data.sectionOrder = ['education'];
    const t = texts(layoutSkynet(data, measure).ops);
    // "Year" header and each year render whole, never split into "Yea" + "r".
    expect(t.some((o) => o.text === 'Year')).toBe(true);
    expect(t.some((o) => o.text === 'Yea')).toBe(false);
  });
});

describe('inline runs', () => {
  it('raises ordinals but leaves one marked plain by the importer', () => {
    expect(inlineRuns('1st').map((r) => r.sup)).toEqual([false, true]);
    expect(inlineRuns('49' + String.fromCharCode(0x200b) + 'th').some((r) => r.sup)).toBe(false);
  });

  it('keeps an asterisk inside a bold run', () => {
    expect(inlineRuns('Got **A* grade**')).toEqual([
      { text: 'Got ', bold: false, sup: false },
      { text: 'A* grade', bold: true, sup: false },
    ]);
  });
});

describe('the PDF file', () => {
  it('is one A4 page with the full fonts embedded and readable', async () => {
    const { bytes, replaced } = await buildSkynetPdf(SAMPLE, assets);
    expect(replaced).toEqual([]);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect([width, height]).toEqual([595, 842]);
    // Full embeds: a subset from @pdf-lib/fontkit 1.1.1 corrupts glyf and
    // renders blank in Chrome, Firefox and MuPDF while text still extracts.
    expect(bytes.length).toBeGreaterThan(500_000);
  });

  it('maps pasted hyphens and drops invisible characters, and reports the rest', async () => {
    const data = clone();
    data.distinctions[0].bullets[0].text = 'Co‑founded soft­hyphen 🚀';
    const { replaced } = await buildSkynetPdf(data, assets);
    expect(replaced).toEqual(['🚀']);
  });

  it('refuses to write a second page rather than cut content off', async () => {
    const data = clone();
    data.extras = Array.from({ length: 12 }, (_, i) => ({
      category: `Group ${i}`,
      bullets: Array.from({ length: 4 }, () => ({ text: 'A point', year: '2024' })),
    }));
    await expect(buildSkynetPdf(data, assets)).rejects.toBeInstanceOf(PageOverflowError);
  });

  it('escapes the email link so a stray ")" cannot corrupt the file', async () => {
    expect(uriLiteral('mailto:a)b@x.com')).toBe('mailto:a\\)b@x.com');
    expect(uriLiteral('mailto:ab\\c@x.com')).toBe('mailto:ab%5Cc@x.com');
    expect(uriLiteral('mailto:caf€@x.com')).toBe('mailto:caf%E2%82%AC@x.com');
    const data = clone();
    data.email = 'asha.verma@x.com :)';
    const { bytes } = await buildSkynetPdf(data, assets);
    await expect(PDFDocument.load(bytes)).resolves.toBeTruthy();
  });

  it('composes decomposed accents instead of printing "?"', async () => {
    const data = clone();
    data.distinctions[0].bullets[0].text = 'Café society';
    expect((await buildSkynetPdf(data, assets)).replaced).toEqual([]);
  });

  it('lays out a malformed draft instead of crashing', () => {
    const junk = {
      ...clone(),
      experience: [{ type: null, firm: 5, role: undefined, dates: [], subSections: [{ label: null, bullets: [1, null, 'ok'] }] }],
      positions: [{ title: null, bullets: [2], year: 2024 }],
    };
    const data = hydrateSkynet(junk as never);
    expect(() => layoutSkynet(data, measure)).not.toThrow();
  });

  it('shrinks a long field instead of cutting it short when shrinking fits', async () => {
    // Found by red-teaming: rounding left the shrunk text a hair over its
    // cell, and it fell through to "…" at ~8pt.
    const data = clone();
    data.taglines = ['finance delivered designed campaign 60+ built', data.taglines[1], data.taglines[2]];
    data.experience[0] = { ...data.experience[0], subSections: [{ label: 'Internationalisation', bullets: ['A point'] }] };
    // Real Carlito metrics, as the writer measures.
    const kit = fontkit as unknown as { create(b: Uint8Array): { unitsPerEm: number; layout(t: string, f: object): { glyphs: { advanceWidth: number }[] } } };
    const fonts = { regular: kit.create(pub('Carlito-Regular.ttf')), bold: kit.create(pub('Carlito-Bold.ttf')) };
    const real: Measure = (t, f, s) =>
      (fonts[f].layout(t, FEATURES).glyphs.reduce((a, g) => a + g.advanceWidth, 0) / fonts[f].unitsPerEm) * s;
    const cut = texts(layoutSkynet(data, real).ops).filter((t) => t.text.endsWith('…'));
    expect(cut).toEqual([]);
  });

  it('drops direction marks and keeps an accent typed just after bold', async () => {
    const data = clone();
    data.distinctions[0].bullets[0].text = '‎Ranked‏ ‪first‬, Caf**e**́ club';
    expect((await buildSkynetPdf(data, assets)).replaced).toEqual([]);
  });

  it('links the email as typed, even when the font cannot draw it', () => {
    const data = { ...clone(), email: 'zoë.ü@例え.jp' };
    const link = layoutSkynet(data, measure, (s) => s.replace(/[^\x20-\x7e]/g, '?')).ops.find((o) => o.kind === 'link');
    expect(link && link.kind === 'link' && link.uri).toBe('mailto:zoë.ü@例え.jp');
  });

  it('loads a draft whose section order holds a non-string', () => {
    const junk = { ...clone(), sectionOrder: ['education', 5], hiddenSections: [null, 'projects'] };
    expect(() => hydrateSkynet(junk as never)).not.toThrow();
    expect(hydrateSkynet(junk as never).sectionOrder).toContain('education');
  });

  it('names the file after the student, keeping combining marks', () => {
    expect(pdfFileName('A'.repeat(300))).toBe('A'.repeat(60) + '_Resume.pdf');
    expect(pdfFileName('Rohan Sengupta')).toBe('Rohan_Sengupta_Resume.pdf');
    expect(pdfFileName('  ')).toBe('Resume.pdf');
    expect(pdfFileName('राम')).toBe('राम_Resume.pdf');
  });
});
