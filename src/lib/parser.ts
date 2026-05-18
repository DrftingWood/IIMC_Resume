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

/** Split items into clusters separated by large x-gaps. Pure-space
 *  items (which the IIM-C template uses as wide column-padding) are
 *  filtered out before computing gaps so the cell boundaries appear as
 *  genuine large gaps between content items. */
function splitByLargeGaps(items: TextItem[], gapThreshold = 20): string[] {
  const contentItems = items.filter((it) => it.str.trim().length > 0);
  if (!contentItems.length) return [];
  const sorted = [...contentItems].sort((a, b) => a.x - b.x);
  const clusters: TextItem[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].x - (sorted[i - 1].x + sorted[i - 1].width);
    if (gap > gapThreshold) clusters.push([sorted[i]]);
    else clusters[clusters.length - 1].push(sorted[i]);
  }
  return clusters.map(joinItems);
}

/** Split items into up to N clusters by picking the N-1 largest x-gaps
 *  (≥ gapThreshold). Returns at most N strings. */
function splitByTopGaps(
  items: TextItem[],
  maxClusters: number,
  gapThreshold = 15
): string[] {
  const contentItems = items.filter((it) => it.str.trim().length > 0);
  if (!contentItems.length) return [];
  const sorted = [...contentItems].sort((a, b) => a.x - b.x);
  const gaps: { idx: number; gap: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const g = sorted[i].x - (sorted[i - 1].x + sorted[i - 1].width);
    gaps.push({ idx: i, gap: g });
  }
  const splits = gaps
    .filter((g) => g.gap > gapThreshold)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, maxClusters - 1)
    .map((g) => g.idx)
    .sort((a, b) => a - b);
  const out: string[] = [];
  let prev = 0;
  for (const s of splits) {
    out.push(joinItems(sorted.slice(prev, s)));
    prev = s;
  }
  out.push(joinItems(sorted.slice(prev)));
  return out;
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

interface BulletXResult {
  x: number;
  glyphMode: boolean;
}

function findBulletXInfo(lines: PdfLine[]): BulletXResult | null {
  // Try the bullet glyph first.
  const glyphXs: number[] = [];
  for (const l of lines) {
    for (const it of l.items) {
      if (BULLET_GLYPH_RE.test(it.str.trim())) glyphXs.push(it.x);
    }
  }
  if (glyphXs.length >= 3) {
    glyphXs.sort((a, b) => a - b);
    return { x: glyphXs[Math.floor(glyphXs.length / 2)], glyphMode: true };
  }

  // Fallback: the LaTeX template renders bullets as vector paths, so the
  // text stream starts directly with the bullet text. Recover the bullet
  // column by clustering "candidate" x positions:
  //   - every line's startX (a pure-bullet line contributes its startX)
  //   - the x of the item that sits AFTER the biggest internal gap in
  //     each line (a label+bullet line contributes the post-gap x)
  const candidates: number[] = [];
  for (const l of lines) {
    candidates.push(l.startX);
    const sorted = [...l.items].sort((a, b) => a.x - b.x);
    let maxGap = 0;
    let postGapX = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].x - (sorted[i - 1].x + sorted[i - 1].width);
      if (gap > maxGap) {
        maxGap = gap;
        postGapX = sorted[i].x;
      }
    }
    if (maxGap > 20) candidates.push(postGapX);
  }
  if (candidates.length < 3) return null;

  // 5pt histogram, return the densest bin's center.
  const bins = new Map<number, number>();
  for (const x of candidates) {
    const b = Math.round(x / 5) * 5;
    bins.set(b, (bins.get(b) ?? 0) + 1);
  }
  let bestBin = 0;
  let bestCount = 0;
  for (const [b, c] of bins) {
    if (c > bestCount) {
      bestCount = c;
      bestBin = b;
    }
  }
  return bestCount >= 2 ? { x: bestBin, glyphMode: false } : null;
}

function findBulletX(lines: PdfLine[]): number | null {
  return findBulletXInfo(lines)?.x ?? null;
}

function findYearX(lines: PdfLine[]): number {
  // Use the 70th-percentile endX as a robust "right edge" — using max is
  // brittle because pdfjs occasionally reports an anomalous endX (a
  // single overflowing item) that inflates the threshold and pushes real
  // year tokens out of the right column.
  const ends = lines.map((l) => l.endX).sort((a, b) => a - b);
  if (!ends.length) return Infinity;
  const robustEnd = ends[Math.floor(ends.length * 0.7)] ?? ends[ends.length - 1];
  const rightThreshold = robustEnd * 0.85;

  // Year tokens at the right edge only. "10" / "12" / "18" inside bullet
  // text also match YEAR_TOKEN_RE, so we filter by x >= rightThreshold.
  const yearXs: number[] = [];
  for (const l of lines) {
    for (const it of l.items) {
      if (YEAR_TOKEN_RE.test(it.str.trim()) && it.x >= rightThreshold) {
        yearXs.push(it.x);
      }
    }
  }
  if (yearXs.length >= 1) {
    return Math.min(...yearXs) - 4;
  }
  return Infinity;
}

function findLineHeight(lines: PdfLine[]): number {
  // The label-vs-bullet interleaving distorts y-delta medians, so derive
  // line height from the median item font height times a 1.4 line-spacing
  // factor (typical for the IIM-C body font).
  const hs: number[] = [];
  for (const l of lines) {
    for (const it of l.items) {
      if (it.str.trim().length > 0 && it.height > 0) hs.push(it.height);
    }
  }
  if (!hs.length) return 12;
  hs.sort((a, b) => a - b);
  const medHeight = hs[Math.floor(hs.length / 2)];
  return medHeight * 1.4;
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

const ORPHAN_SUPERSCRIPT_RE = /^(?:nd|rd|th|st)(?:\s+(?:nd|rd|th|st))*$/i;

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
    let midText = joinItems(midItems);
    // Stray superscript orphans: pdfjs sometimes places "nd" / "rd" / "th"
    // on their own y-line a few pt above the digit. They land in the
    // mid-column with no real content; ignore.
    if (midText && ORPHAN_SUPERSCRIPT_RE.test(midText.trim())) midText = '';
    return {
      y: l.y,
      leftItems,
      midItems,
      rightItems,
      leftText: joinItems(leftItems),
      midText,
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
    // The tagline cells are 3 distinct items separated by 50-60pt wide
    // space-only items. splitByTopGaps filters spaces and uses the 2
    // largest item-to-item gaps as cluster boundaries.
    const parts = splitByTopGaps(l.items, 3, 15);
    if (parts.length >= 3) {
      t1 = parts[0];
      t2 = parts[1];
      t3 = parts.slice(2).join(' ');
      break;
    }
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
  const info = findBulletXInfo(lines);
  if (!info) return [];
  const { x: bulletX, glyphMode } = info;
  const yearX = findYearX(lines);
  const lineHeight = findLineHeight(lines);
  // Within a label cell, fragments are at ~1.0 * line-height. Between
  // cells, fragments are separated by ~1.5+ line-heights. 1.15 is a safe
  // bracket value.
  const sameLabelGap = lineHeight * 1.15;

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
      // When the • glyph is not in the PDF text stream (LaTeX template),
      // we can't distinguish a new bullet from a wrapped continuation by
      // glyph alone. The IIM-C template has single-line bullets, so we
      // treat every mid-column line as a new bullet.
      const isNewBullet = r.hasBulletGlyph || !glyphMode;
      if (isNewBullet) {
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
  const info = findBulletXInfo(lines);
  if (!info) return [];
  const { x: bulletX, glyphMode } = info;
  const yearX = findYearX(lines);
  const lineHeight = findLineHeight(lines);
  const sameLabelGap = lineHeight * 1.15;

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
      const isNewBullet = r.hasBulletGlyph || !glyphMode || lastBulletIdx[idx] < 0;
      if (isNewBullet) {
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

  const info = findBulletXInfo(bodyLines);
  if (!info) return { entries: [], rightText };
  const { x: bulletX, glyphMode } = info;
  const yearX = findYearX(bodyLines);
  const lineHeight = findLineHeight(bodyLines);
  const sameLabelGap = lineHeight * 1.15;

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
    // Banner: firm | role | dates. The 3 cells are joined into one
    // PdfLine but separated by very wide pure-space items. splitByTopGaps
    // filters those and picks the 2 widest item-to-item gaps as the cell
    // boundaries.
    const allItems = [
      ...block.banner.leftItems,
      ...block.banner.midItems,
      ...block.banner.rightItems,
    ];
    const fullBanner = joinItems(allItems);
    const dm = fullBanner.match(DATE_RANGE_RE)!;
    const dates = dm[0];

    const bannerCells = splitByTopGaps(allItems, 3, 15);
    let firm = '';
    let role = '';
    if (bannerCells.length >= 3) {
      firm = bannerCells[0];
      role = bannerCells[1];
      // bannerCells[2] is the date range (already captured in `dates`)
    } else if (bannerCells.length === 2) {
      firm = bannerCells[0];
      const rest = bannerCells[1];
      // If cells[1] is the dates, treat firm as is. Otherwise it's role.
      if (DATE_RANGE_RE.test(rest)) {
        // firm | dates — no role rendered.
      } else {
        role = rest;
      }
    } else {
      firm = fullBanner.replace(DATE_RANGE_RE, '').trim();
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
      const isNewBullet = r.hasBulletGlyph || !glyphMode || lastBulletIdx[idx] < 0;
      if (isNewBullet) {
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

  const rows: EducationRow[] = [];
  for (const line of filtered) {
    // Always take the top 3 gaps as cell separators, with a low absolute
    // threshold (5pt) so the gpa↔year gap is still picked up even when
    // the gpa cell text is wider than usual (e.g. "B.Tech Chemical
    // Engineering" pushes neighbouring content closer than "MBA" does).
    const cells = splitByTopGaps(line.items, 4, 5);
    if (cells.length < 2) continue;
    const [degree = '', institute = '', gpa = '', year = ''] = cells;
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
