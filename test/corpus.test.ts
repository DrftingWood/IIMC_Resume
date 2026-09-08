import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { linesFromPdf } from './support/pdf';
import { parseResume } from '@/templates/skynet/parser';
import { batchNumberFromLines } from '@/lib/batch';
import type { PdfLine } from '@/lib/pdfExtract';

const DIR = process.env.SKYNET_CORPUS_DIR;

/*
 * The three helpers below independently re-derive, from raw PdfLines, the
 * same section-anchor and margin-label/firm-block signals that
 * src/templates/skynet/parser.ts computes internally (in splitSections and
 * parseIndustry). They are deliberately NOT imported from the parser
 * (nothing there is exported for this purpose, and the parser is frozen) so
 * that gaps 2 and 3 below can be checked against an independent
 * reconstruction rather than the parser grading its own homework.
 */
const ANCHORS = [
  'ACADEMIC PROFILE',
  'ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS',
  'PROJECTS AND PAPERS',
  'ENTREPRENEURIAL/NON-PROFIT VENTURE',
  'INDUSTRY EXPERIENCE',
  'POSITION OF RESPONSIBILITY',
  'EXTRA-CURRICULAR ACHIEVEMENTS',
];
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const INSTITUTE_FOOTER_RE = /^Indian Institute of Management Calcutta\s*$/i;
const DATE_RANGE_RE = /[A-Za-z]+\s*[`'’]\s*\d{2}\s*[-–]\s*[A-Za-z]+\s*[`'’]\s*\d{2}/;
const BULLET_GLYPH_LEAD_RE = /^[■▪•·●‣◦∙⋅]+\s*/;

/** Slice out the raw lines belonging to the INDUSTRY EXPERIENCE section. */
function industrySectionLines(allLines: PdfLine[]): PdfLine[] {
  const filtered = allLines.filter(
    (l) => !EMAIL_RE.test(l.text) && !INSTITUTE_FOOTER_RE.test(l.text.trim())
  );
  const anchors: { idx: number; name: string }[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const t = filtered[i].text.toUpperCase().replace(/\s+/g, ' ').trim();
    const hit = ANCHORS.find((a) => t.startsWith(a) && !anchors.some((x) => x.name === a));
    if (hit) anchors.push({ idx: i, name: hit });
  }
  const pos = anchors.findIndex((a) => a.name === 'INDUSTRY EXPERIENCE');
  if (pos < 0) return [];
  const start = anchors[pos].idx + 1;
  const end = pos + 1 < anchors.length ? anchors[pos + 1].idx : filtered.length;
  return filtered.slice(start, end);
}

/** Distinct rotated margin-label strings and firm-banner ("date range") row
 *  count within the industry section — independent counts for gaps 2 & 3. */
function marginLabelsAndBlocks(sectionLines: PdfLine[]): {
  labels: string[];
  blockCount: number;
} {
  const labelSet = new Set<string>();
  let blockCount = 0;
  for (const l of sectionLines) {
    const rot = l.items.filter((it) => it.rotated);
    if (rot.length) {
      const text = [...rot]
        .sort((a, b) => a.x - b.x)
        .map((it) => it.str)
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) labelSet.add(text);
    }
    const body = l.items.filter((it) => !it.rotated);
    if (body.length) {
      const text = [...body]
        .sort((a, b) => a.x - b.x)
        .map((it) => it.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (DATE_RANGE_RE.test(text)) blockCount++;
    }
  }
  return { labels: [...labelSet], blockCount };
}

// Opt-in: the corpus is real students' resumes and is never committed.
describe.skipIf(!DIR)('skynet corpus', () => {
  const files = DIR ? readdirSync(DIR).filter((f) => f.endsWith('.pdf')) : [];

  it('has the expected corpus size', () => {
    expect(files.length).toBe(450);
  });

  it('parses every resume without failed sections', async () => {
    const problems: string[] = [];
    let withIndustry = 0,
      withPositions = 0,
      withProjects = 0,
      withEntrepreneurial = 0;

    // Gap 1: every industry bullet, on every resume, diffed against its raw
    // source line for truncation (not just the one bullet the unit tests guard).
    const truncatedBullets: string[] = [];

    // Gap 2: the three-label "Others" margin group, never exercised end to end
    // by the 5 anonymised fixtures.
    const othersLabelFiles: string[] = [];
    const othersMismatchFiles: string[] = [];
    let othersReflectedInParsedType = 0;

    // Gap 3: margin labels outnumbering firm blocks — believed unreachable.
    const degenerateFiles: string[] = [];

    for (const f of files) {
      const lines = await linesFromPdf(join(DIR!, f));
      const { data, failedSections } = parseResume(lines);

      if (failedSections.length) problems.push(`${f}: failed ${failedSections.join()}`);
      if (batchNumberFromLines(lines) !== 63) problems.push(`${f}: batch not 63`);
      if ((data.education?.length ?? 0) < 3) problems.push(`${f}: education ${data.education?.length}`);

      const bullets = [
        ...(data.distinctions ?? []).flatMap((g) => g.bullets.map((b) => b.text)),
        ...(data.extras ?? []).flatMap((g) => g.bullets.map((b) => b.text)),
        ...(data.experience ?? []).flatMap((e) => e.subSections.flatMap((s) => s.bullets)),
      ];
      for (const b of bullets) {
        if (/[■▪•]/.test(b)) problems.push(`${f}: glyph retained`);
      }
      for (const l of (data.experience ?? []).flatMap((e) => e.subSections.map((s) => s.label))) {
        if (/Full Time|Intern|Others/.test(l)) problems.push(`${f}: margin label leaked`);
      }

      if ((data.experience?.length ?? 0) > 0) withIndustry++;
      if ((data.positions?.length ?? 0) > 0) withPositions++;
      if ((data.projects?.length ?? 0) > 0) withProjects++;
      if ((data.entrepreneurial?.length ?? 0) > 0) withEntrepreneurial++;

      // ---- Gap 1: check EVERY industry bullet against its raw source line.
      const industryBullets = (data.experience ?? []).flatMap((e) =>
        e.subSections.flatMap((s) => s.bullets)
      );
      for (const b of industryBullets) {
        const parsedNorm = b.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
        if (!parsedNorm) continue;
        const truncated = lines.some((l) => {
          const rawNorm = l.text.replace(BULLET_GLYPH_LEAD_RE, '').replace(/\s+/g, ' ').trim();
          return rawNorm.length > parsedNorm.length && rawNorm.startsWith(parsedNorm);
        });
        if (truncated) truncatedBullets.push(`${f}: "${parsedNorm.slice(0, 100)}"`);
      }

      // ---- Gaps 2 & 3: margin labels vs. firm blocks, independently derived.
      const sectionLines = industrySectionLines(lines);
      const { labels, blockCount } = marginLabelsAndBlocks(sectionLines);

      if (labels.some((l) => /^others$/i.test(l))) {
        othersLabelFiles.push(f);
        const reflected = (data.experience ?? []).some((e) => /^others$/i.test(e.type));
        if (reflected) othersReflectedInParsedType++;
        else othersMismatchFiles.push(f);
      }

      if (labels.length > blockCount) {
        degenerateFiles.push(`${f} (labels=${labels.length}, blocks=${blockCount})`);
      }
    }

    console.log('--- corpus summary ---');
    console.log(`files scanned: ${files.length}`);
    console.log(
      `withIndustry=${withIndustry} withPositions=${withPositions} withProjects=${withProjects} withEntrepreneurial=${withEntrepreneurial}`
    );
    console.log(`[gap 1] truncated industry bullets: ${truncatedBullets.length}`);
    console.log(truncatedBullets.slice(0, 20));
    console.log(`[gap 2] files with an 'Others' margin label: ${othersLabelFiles.length}`, othersLabelFiles);
    console.log(
      `[gap 2] 'Others' reflected in parsed experience[].type: ${othersReflectedInParsedType} / ${othersLabelFiles.length}`
    );
    console.log(`[gap 2] label present but missing from parsed types:`, othersMismatchFiles);
    console.log(`[gap 3] degenerate branch (labels > blocks): ${degenerateFiles.length}`, degenerateFiles);
    console.log(`problems (first 20):`, problems.slice(0, 20));

    expect(problems.slice(0, 20)).toEqual([]);
    // Independently counted from the raw PDFs during spec research.
    expect(withIndustry).toBe(445);
    expect(withPositions).toBe(164);
    expect(withProjects).toBe(121);
    expect(withEntrepreneurial).toBe(17);

    // Gap 1: no industry bullet may be a truncated prefix of its source line.
    expect(truncatedBullets.slice(0, 20)).toEqual([]);

    // Gap 2: at least one resume actually exercises the "Others" margin
    // group end to end (label present in the PDF -> "Others" in parsed data).
    expect(othersLabelFiles.length).toBeGreaterThan(0);
    expect(othersReflectedInParsedType).toBeGreaterThan(0);

    // Gap 3: the "more labels than firm blocks" branch is believed
    // unreachable on this corpus. Report, do not silently allow.
    expect(degenerateFiles).toEqual([]);
  }, 600_000);
});
