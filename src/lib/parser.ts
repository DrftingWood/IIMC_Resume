import type {
  ResumeData,
  EducationRow,
  BulletGroup,
  ExperienceEntry,
  ExperienceSubSection,
  PositionEntry,
  YearedBullet,
} from '@/types/resume';
import type { PdfLine, TextItem } from './pdfExtract';

const ANCHORS = [
  'ACADEMIC QUALIFICATIONS',
  'ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS',
  'INDUSTRY EXPERIENCE',
  'POSITIONS OF RESPONSIBILITY',
  'EXTRA-CURRICULAR ACHIEVEMENTS',
];

const BULLET_GLYPHS = '•·●▪‣◦∙⋅';
const BULLET_GLYPH_RE = new RegExp('^[' + BULLET_GLYPHS + ']');
const YEAR_TOKEN_RE = /^(?:(?:19|20)\d{2}|\d{2}\s*-\s*\d{2}|\d{2}\s*,\s*\d{2}|\d{2})$/;
const YEAR_TAIL_RE = /\s+((?:19|20)\d{2}|\d{2}\s*-\s*\d{2}|\d{2}\s*,\s*\d{2}|\d{2})\s*$/;
const DATE_RANGE_RE = /[A-Za-z]+\s*[`'’]\s*\d{2}\s*[-–]\s*[A-Za-z]+\s*[`'’]\s*\d{2}/;
const MBA_ID_RE = /MBA\/\d+\/\d+/;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const INSTITUTE_FOOTER_RE = /^Indian Institute of Management Calcutta\s*$/i;

/* ----------------------------- helpers ----------------------------------- */

function escapeRe(s: string): string {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function joinItems(items: TextItem[]): string {
  if (!items.length) return '';
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let buf = '';
  let prevEnd = -Infinity;
  for (const it of sorted) {
    const gap = it.x - prevEnd;
    if (buf && gap > 1.2 && !/\s$/.test(buf) && !/^\s/.test(it.str)) buf += ' ';
    buf += it.str;
    prevEnd = it.x + it.width;
  }
  return buf.replace(/\s+/g, ' ').trim();
}

function stripBulletGlyph(text: string): string {
  return text.replace(new RegExp('^[' + BULLET_GLYPHS + ']+\\s*'), '').trim();
}

function startsWithBullet(items: TextItem[]): boolean {
  if (!items.length) return false;
  return BULLET_GLYPH_RE.test(items[0].str.trim());
}

function splitYearTail(text: string): { text: string; year: string } {
  const m = text.match(YEAR_TAIL_RE);
  if (!m) return { text: text.trim(), year: '' };
  return { text: text.slice(0, m.index).trim(), year: m[1].trim() };
}

/** Split a list of items into clusters separated by large x-gaps.
 *  Used to recover the 3-cell tagline row from a single PdfLine. */
function splitByLargeGaps(items: TextItem[], gapThreshold = 20): string[] {
  if (!items.length) return [];
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const clusters: TextItem[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].x - (sorted[i - 1].x + sorted[i - 1].width);
    if (gap > gapThreshold) clusters.push([sorted[i]]);
    else clusters[clusters.length - 1].push(sorted[i]);
  }
  return clusters.map(joinItems);
}

/* ----------------------------- section split ----------------------------- */

interface Section {
  name: string;
  headerRest: string;
  lines: PdfLine[];
}

function findAnchorLine(line: PdfLine): string | null {
  const t = line.text.toUpperCase().replace(/\s+/g, ' ').trim();
  for (const a of ANCHORS) {
    if (t === a || t.startsWith(a + ' ') || t.startsWith(a)) return a;
  }
  return null;
}

function isFooterLine(l: PdfLine): boolean {
  return EMAIL_RE.test(l.text) || INSTITUTE_FOOTER_RE.test(l.text.trim());
}

function splitSections(allLines: PdfLine[]): {
  header: PdfLine[];
  sections: Section[];
} {
  // Remove footer lines from sections (they show up at the bottom of the
  // last section and otherwise get mis-parsed as bullet continuations).
  const lines = allLines.filter((l) => !isFooterLine(l));

  const anchors: { idx: number; name: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const a = findAnchorLine(lines[i]);
    if (a && !anchors.find((x) => x.name === a)) anchors.push({ idx: i, name: a });
  }
  if (!anchors.length) return { header: lines, sections: [] };

  const header = lines.slice(0, anchors[0].idx);
  const sections: Section[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const anchorLine = lines[anchors[i].idx];
    const restRe = new RegExp('^\\s*' + escapeRe(anchors[i].name), 'i');
    const headerRest = anchorLine.text.replace(restRe, '').trim();
    const start = anchors[i].idx + 1;
    const end = i + 1 < anchors.length ? anchors[i + 1].idx : lines.length;
    sections.push({
      name: anchors[i].name,
      headerRest,
      lines: lines.slice(start, end),
    });
  }
  return { header, sections };
}

/* --------------------- column detection per-section ---------------------- */

function findBulletX(lines: PdfLine[]): number | null {
  const xs: number[] = [];
  for (const l of lines) {
    for (const it of l.items) {
      if (BULLET_GLYPH_RE.test(it.str.trim())) xs.push(it.x);
    }
  }
  if (!xs.length) return null;
  xs.sort((a, b) => a - b);
  return xs[Math.floor(xs.length / 2)];
}

function findYearX(lines: PdfLine[]): number {
  // Prefer the leftmost x of items that look like year tokens.
  const yearXs: number[] = [];
  for (const l of lines) {
    for (const it of l.items) {
      if (YEAR_TOKEN_RE.test(it.str.trim())) yearXs.push(it.x);
    }
  }
  if (yearXs.length >= 3) {
    return Math.min(...yearXs) - 4;
  }
  // Fallback: 30pt strip at the right edge.
  let maxEndX = 0;
  for (const l of lines) maxEndX = Math.max(maxEndX, l.endX);
  return maxEndX === 0 ? Infinity : maxEndX - 30;
}

function findLineHeight(lines: PdfLine[]): number {
  if (lines.length < 2) return 12;
  const deltas: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const d = lines[i - 1].y - lines[i].y;
    if (d > 2 && d < 40) deltas.push(d);
  }
  if (!deltas.length) return 12;
  deltas.sort((a, b) => a - b);
  return deltas[Math.floor(deltas.length / 2)];
}

/* ----------------------- per-line column classification ------------------ */

interface RowParts {
  y: number;
  leftItems: TextItem[];
  midItems: TextItem[];
  rightItems: TextItem[];
  leftText: string;
  midText: string;
  rightText: string;
  hasBulletGlyph: boolean;
}

function classifyLines(lines: PdfLine[], bulletX: number, yearX: number): RowParts[] {
  const TOL = 6;
  return lines.map((l) => {
    const leftItems: TextItem[] = [];
    const midItems: TextItem[] = [];
    const rightItems: TextItem[] = [];
    for (const it of l.items) {
      const center = it.x + it.width / 2;
      if (center >= yearX - 2) rightItems.push(it);
      else if (center >= bulletX - TOL) midItems.push(it);
      else leftItems.push(it);
    }
    return {
      y: l.y,
      leftItems,
      midItems,
      rightItems,
      leftText: joinItems(leftItems),
      midText: joinItems(midItems),
      rightText: joinItems(rightItems),
      hasBulletGlyph: startsWithBullet(midItems),
    };
  });
}

/* -------------------------------- header --------------------------------- */

function parseHeader(lines: PdfLine[]): {
  name: string;
  mbaId: string;
  taglines: [string, string, string];
} {
  const isInstituteLine = (t: string) =>
    /INDIAN INSTITUTE OF MANAGEMENT/i.test(t) || /भारतीय/.test(t);

  let mbaId = '';
  for (const l of lines) {
    const m = l.text.match(MBA_ID_RE);
    if (m) {
      mbaId = m[0];
      break;
    }
  }

  // Name = the tallest non-institute, non-MBA-id line.
  const nameCandidates = lines.filter(
    (l) => !isInstituteLine(l.text) && !MBA_ID_RE.test(l.text) && l.text.trim().length > 1
  );
  let name = '';
  if (nameCandidates.length) {
    const maxH = Math.max(...nameCandidates.map((l) => l.height));
    const tallest = nameCandidates.filter((l) => Math.abs(l.height - maxH) < 0.5);
    tallest.sort((a, b) => b.y - a.y || a.startX - b.startX);
    name = (tallest[0]?.text ?? '').replace(MBA_ID_RE, '').trim();
  }

  // Taglines: find a single line that splits into 3 by large x-gaps.
  let t1 = '',
    t2 = '',
    t3 = '';
  const taglineLineCandidates = lines.filter((l) => {
    const t = l.text.trim();
    if (!t || t === name) return false;
    if (isInstituteLine(t) || MBA_ID_RE.test(t)) return false;
    const letters = t.replace(/[^A-Za-z]/g, '');
    if (letters.length < 5) return false;
    const upper = t.replace(/[^A-Z]/g, '');
    return upper.length / Math.max(letters.length, 1) > 0.55;
  });

  for (const l of taglineLineCandidates) {
    const parts = splitByLargeGaps(l.items, 20);
    if (parts.length >= 3) {
      t1 = parts[0];
      t2 = parts[1];
      t3 = parts.slice(2).join(' ');
      break;
    }
    // also try whitespace-based fallback on the joined text
    const wsParts = l.text.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
    if (wsParts.length >= 3) {
      t1 = wsParts[0];
      t2 = wsParts[1];
      t3 = wsParts.slice(2).join(' ');
      break;
    }
  }

  // If we still failed, take the last three candidate lines as taglines.
  if (!t1 && taglineLineCandidates.length >= 1) {
    const tail = taglineLineCandidates.slice(-3);
    t1 = tail[0]?.text ?? '';
    t2 = tail[1]?.text ?? '';
    t3 = tail[2]?.text ?? '';
  }

  return { name, mbaId, taglines: [t1, t2, t3] };
}

/* -------------------- two-pass label cell extraction --------------------- */

interface LabelCell {
  texts: string[];
  ys: number[];
  yCenter: number;
}

function buildLabelCells(rows: RowParts[], sameLabelGap: number): LabelCell[] {
  const cells: LabelCell[] = [];
  let cur: LabelCell | null = null;
  let prevY: number | null = null;

  for (const r of rows) {
    if (!r.leftText) continue;
    const sameCell = cur != null && prevY != null && prevY - r.y <= sameLabelGap;
    if (sameCell && cur) {
      cur.texts.push(r.leftText);
      cur.ys.push(r.y);
    } else {
      cur = { texts: [r.leftText], ys: [r.y], yCenter: r.y };
      cells.push(cur);
    }
    prevY = r.y;
  }

  for (const c of cells) {
    c.yCenter = c.ys.reduce((a, b) => a + b, 0) / c.ys.length;
  }
  return cells;
}

/** Boundary-based cell finder.
 *  cells are in y-descending order: cells[0] is topmost (highest y).
 *  Boundary between cell i and cell i+1 = midpoint of their yCenters. */
function makeCellIdxFinder(cells: LabelCell[]): (y: number) => number {
  return (y: number) => {
    if (!cells.length) return 0;
    for (let i = 0; i < cells.length - 1; i++) {
      const boundary = (cells[i].yCenter + cells[i + 1].yCenter) / 2;
      if (y >= boundary) return i;
    }
    return cells.length - 1;
  };
}

/* --------------------- generic column-aware bullet table ----------------- */

function parseBulletTable(lines: PdfLine[]): BulletGroup[] {
  if (!lines.length) return [];
  const bulletX = findBulletX(lines);
  if (bulletX == null) return [];
  const yearX = findYearX(lines);
  const lineHeight = findLineHeight(lines);
  const sameLabelGap = lineHeight * 1.7;

  const rows = classifyLines(lines, bulletX, yearX);

  // Pass 1: build label cells from left-column items.
  const cells = buildLabelCells(rows, sameLabelGap);

  // Build groups (one per cell, plus one unlabeled if no cells).
  const groups: BulletGroup[] = cells.map((c) => ({
    category: c.texts.join('\n'),
    bullets: [],
  }));
  if (!groups.length) groups.push({ category: '', bullets: [] });

  const findIdx = makeCellIdxFinder(cells);
  const lastBullet: Array<YearedBullet | null> = groups.map(() => null);

  // Pass 2: assign every bullet (or continuation) to the owning cell.
  for (const r of rows) {
    if (!r.midText && !r.rightText) continue;
    const idx = findIdx(r.y);
    const group = groups[idx];

    const yearFromRight =
      r.rightText && YEAR_TOKEN_RE.test(r.rightText.trim())
        ? r.rightText.trim()
        : '';

    if (r.midText) {
      if (r.hasBulletGlyph) {
        const stripped = stripBulletGlyph(r.midText);
        let { text, year } = splitYearTail(stripped);
        if (!year && yearFromRight) year = yearFromRight;
        const b: YearedBullet = { text, year };
        group.bullets.push(b);
        lastBullet[idx] = b;
      } else {
        const stripped = stripBulletGlyph(r.midText);
        const lb = lastBullet[idx];
        if (lb) {
          const { text: t, year: y } = splitYearTail(stripped);
          lb.text = (lb.text + ' ' + t).trim();
          if (y && !lb.year) lb.year = y;
          if (yearFromRight && !lb.year) lb.year = yearFromRight;
        } else if (stripped) {
          const { text, year } = splitYearTail(stripped);
          const b: YearedBullet = { text, year: year || yearFromRight };
          group.bullets.push(b);
          lastBullet[idx] = b;
        }
      }
    } else if (yearFromRight) {
      // Year-only row: attach to the most recent bullet in this cell.
      const lb = lastBullet[idx];
      if (lb && !lb.year) lb.year = yearFromRight;
    }
  }

  return groups.filter((g) => g.bullets.length > 0);
}

/* -------------------------------- positions ------------------------------ */

function parsePositions(lines: PdfLine[]): PositionEntry[] {
  if (!lines.length) return [];
  const bulletX = findBulletX(lines);
  if (bulletX == null) return [];
  const yearX = findYearX(lines);
  const lineHeight = findLineHeight(lines);
  const sameLabelGap = lineHeight * 1.7;

  const rows = classifyLines(lines, bulletX, yearX);
  const cells = buildLabelCells(rows, sameLabelGap);

  const out: PositionEntry[] = cells.map((c) => ({
    title: c.texts.join('\n'),
    bullets: [],
    year: '',
  }));
  if (!out.length) out.push({ title: '', bullets: [], year: '' });

  const findIdx = makeCellIdxFinder(cells);
  const lastBulletIdx: number[] = out.map(() => -1);

  for (const r of rows) {
    if (!r.midText && !r.rightText) continue;
    const idx = findIdx(r.y);
    const entry = out[idx];

    if (r.rightText && YEAR_TOKEN_RE.test(r.rightText.trim()) && !entry.year) {
      entry.year = r.rightText.trim();
    }

    if (r.midText) {
      const stripped = stripBulletGlyph(r.midText);
      if (r.hasBulletGlyph || lastBulletIdx[idx] < 0) {
        entry.bullets.push(stripped);
        lastBulletIdx[idx] = entry.bullets.length - 1;
      } else {
        const i = lastBulletIdx[idx];
        entry.bullets[i] = (entry.bullets[i] + ' ' + stripped).trim();
      }
    }
  }

  return out.filter((e) => e.bullets.length > 0 || e.title);
}

/* -------------------------------- industry ------------------------------- */

function parseIndustry(lines: PdfLine[], headerRest: string): {
  entries: ExperienceEntry[];
  rightText: string;
} {
  // The "XX MONTHS (FULL-TIME)" trailing text was on the section header
  // line. splitSections captured it as `headerRest`.
  let rightText = '';
  const monthsMatch = headerRest.match(/(\d+\s*MONTHS\s*\([^)]+\))/i);
  if (monthsMatch) rightText = monthsMatch[1].toUpperCase();

  // Filter rotated "Intern" / "Full Time" labels (their items show up as
  // tiny short lines once pdfjs unrolls the rotated glyph stream).
  const bodyLines = lines.filter((l) => {
    const t = l.text.trim();
    if (/^full[- ]?time$/i.test(t)) return false;
    if (/^intern$/i.test(t)) return false;
    return true;
  });

  const bulletX = findBulletX(bodyLines);
  if (bulletX == null) return { entries: [], rightText };
  const yearX = findYearX(bodyLines);
  const lineHeight = findLineHeight(bodyLines);
  const sameLabelGap = lineHeight * 1.7;

  const rows = classifyLines(bodyLines, bulletX, yearX);

  // Split rows into per-firm blocks by detecting the date-range banner row.
  interface FirmBlock {
    banner: RowParts;
    body: RowParts[];
  }
  const blocks: FirmBlock[] = [];
  let curBlock: FirmBlock | null = null;
  for (const r of rows) {
    const full = [r.leftText, r.midText, r.rightText].filter(Boolean).join(' ');
    if (DATE_RANGE_RE.test(full)) {
      curBlock = { banner: r, body: [] };
      blocks.push(curBlock);
    } else if (curBlock) {
      curBlock.body.push(r);
    }
  }

  const entries: ExperienceEntry[] = blocks.map((block, i) => {
    // Parse the banner: firm + role + dates separated by big x-gaps.
    const allItems = [
      ...block.banner.leftItems,
      ...block.banner.midItems,
      ...block.banner.rightItems,
    ].sort((a, b) => a.x - b.x);
    const fullBanner = joinItems(allItems);
    const dm = fullBanner.match(DATE_RANGE_RE)!;
    const dates = dm[0];

    // Items excluding the date range
    const dateItems = new Set<TextItem>();
    let datesAccum = '';
    for (let k = allItems.length - 1; k >= 0; k--) {
      datesAccum = (allItems[k].str + ' ' + datesAccum).trim();
      dateItems.add(allItems[k]);
      if (datesAccum.replace(/\s+/g, '').includes(dates.replace(/\s+/g, ''))) break;
    }
    const beforeItems = allItems.filter((it) => !dateItems.has(it));
    const segments = splitByLargeGaps(beforeItems, 12);
    let firm = '';
    let role = '';
    if (segments.length >= 2) {
      firm = segments[0];
      role = segments.slice(1).join(' ');
    } else {
      firm = segments[0] ?? '';
    }

    // Apply two-pass within this firm block.
    const cells = buildLabelCells(block.body, sameLabelGap);
    const subSections: ExperienceSubSection[] = cells.map((c) => ({
      label: c.texts.join('\n'),
      bullets: [],
    }));
    if (!subSections.length) subSections.push({ label: '', bullets: [] });

    const findIdx = makeCellIdxFinder(cells);
    const lastBulletIdx: number[] = subSections.map(() => -1);

    for (const r of block.body) {
      if (!r.midText) continue;
      const idx = findIdx(r.y);
      const sub = subSections[idx];
      const stripped = stripBulletGlyph(r.midText);
      if (r.hasBulletGlyph || lastBulletIdx[idx] < 0) {
        sub.bullets.push(stripped);
        lastBulletIdx[idx] = sub.bullets.length - 1;
      } else {
        const j = lastBulletIdx[idx];
        sub.bullets[j] = (sub.bullets[j] + ' ' + stripped).trim();
      }
    }

    return {
      type: i === 0 ? 'Full Time' : 'Intern',
      firm,
      role,
      dates,
      subSections: subSections.filter((s) => s.bullets.length > 0 || s.label),
    };
  });

  return { entries, rightText };
}

/* ------------------------------- education ------------------------------- */

function parseEducation(lines: PdfLine[]): EducationRow[] {
  const filtered = lines.filter((l) => {
    const t = l.text.toLowerCase();
    return (
      !/^degree\/exam/.test(t) &&
      !/^board\/institute/.test(t) &&
      !/^%\/cgpa/.test(t) &&
      !/^year$/.test(t) &&
      !/degree.*board.*cgpa/.test(t)
    );
  });
  if (!filtered.length) return [];

  // Cluster all item x positions into 4 columns.
  const items = filtered.flatMap((l) => l.items);
  const xs = items.map((it) => it.x).sort((a, b) => a - b);
  const xMin = xs[0];
  const xMax = xs[xs.length - 1];
  const seeds = [
    xMin + (xMax - xMin) * 0.05,
    xMin + (xMax - xMin) * 0.4,
    xMin + (xMax - xMin) * 0.75,
    xMin + (xMax - xMin) * 0.92,
  ];
  const bounds = [
    (seeds[0] + seeds[1]) / 2,
    (seeds[1] + seeds[2]) / 2,
    (seeds[2] + seeds[3]) / 2,
  ];

  const rows: EducationRow[] = [];
  for (const line of filtered) {
    const cols: TextItem[][] = [[], [], [], []];
    for (const it of line.items) {
      const c = it.x + it.width / 2;
      let idx = 0;
      if (c >= bounds[0]) idx = 1;
      if (c >= bounds[1]) idx = 2;
      if (c >= bounds[2]) idx = 3;
      cols[idx].push(it);
    }
    const cells = cols.map(joinItems);
    const [degree, institute, gpa, year] = cells;
    if (!degree && !institute && !gpa && !year) continue;
    if (/degree/i.test(degree) && /board|institute/i.test(institute)) continue;
    rows.push({ degree, institute, gpa, year });
  }
  return rows.slice(0, 8);
}

/* -------------------------------- footer --------------------------------- */

function parseFooter(allLines: PdfLine[]): { email: string; institute: string } {
  let email = '';
  for (const l of allLines) {
    const m = l.text.match(EMAIL_RE);
    if (m) email = m[0];
  }
  return { email, institute: 'Indian Institute of Management Calcutta' };
}

/* ----------------------------- entry point ------------------------------- */

export function parseResume(lines: PdfLine[]): Partial<ResumeData> {
  try {
    const { header, sections } = splitSections(lines);
    const headerInfo = parseHeader(header);
    const footer = parseFooter(lines);
    const getSection = (name: string) =>
      sections.find((s) => s.name === name);

    const education = parseEducation(getSection('ACADEMIC QUALIFICATIONS')?.lines ?? []);
    const distinctions = parseBulletTable(
      getSection('ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS')?.lines ?? []
    );
    const industrySec = getSection('INDUSTRY EXPERIENCE');
    const { entries: experience, rightText: industryRightText } = parseIndustry(
      industrySec?.lines ?? [],
      industrySec?.headerRest ?? ''
    );
    const positions = parsePositions(getSection('POSITIONS OF RESPONSIBILITY')?.lines ?? []);
    const extras = parseBulletTable(getSection('EXTRA-CURRICULAR ACHIEVEMENTS')?.lines ?? []);

    return {
      name: headerInfo.name,
      mbaId: headerInfo.mbaId,
      taglines: headerInfo.taglines,
      education,
      distinctions,
      experience,
      industryRightText,
      positions,
      extras,
      email: footer.email,
      institute: footer.institute,
    };
  } catch (e) {
    console.warn('parseResume failed', e);
    return {};
  }
}

export function parseResumeText(_text: string): Partial<ResumeData> {
  return {};
}
