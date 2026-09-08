import type {
  SkynetResumeData,
  EducationRow,
  BulletGroup,
  ExperienceEntry,
  ExperienceSubSection,
  PositionEntry,
  YearedBullet,
} from './types';
import { DEFAULT_SECTION_ORDER } from './types';
import type { SectionKey } from './types';
import type { PdfLine, TextItem } from '@/lib/pdfExtract';

const ANCHORS = [
  'ACADEMIC PROFILE',
  'ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS',
  'PROJECTS AND PAPERS',
  'ENTREPRENEURIAL/NON-PROFIT VENTURE',
  'INDUSTRY EXPERIENCE',
  'POSITION OF RESPONSIBILITY',
  'EXTRA-CURRICULAR ACHIEVEMENTS',
];

const ANCHOR_TO_KEY: Record<string, SectionKey> = {
  'ACADEMIC PROFILE': 'education',
  'ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS': 'distinctions',
  'PROJECTS AND PAPERS': 'projects',
  'ENTREPRENEURIAL/NON-PROFIT VENTURE': 'entrepreneurial',
  'INDUSTRY EXPERIENCE': 'industry',
  'POSITION OF RESPONSIBILITY': 'positions',
  'EXTRA-CURRICULAR ACHIEVEMENTS': 'extras',
};

// U+25A0 BLACK SQUARE is the Skynet bullet, set in DejaVuMathTeXGyre at 3.4pt.
// The others are retained so a hand-edited resume still parses.
const BULLET_GLYPHS = '■•·●▪‣◦∙⋅';
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
  // Collapse "<digit> nd/rd/th/st" → "<digit>nd" so superscripts merge
  // back into their base number when pdfjs reports them as separate items
  // (the PDF renders the suffix raised — different y, same x cluster).
  return buf
    .replace(/\s+/g, ' ')
    .replace(/\b(\d+)\s+(nd|rd|th|st)\b/gi, '$1$2')
    .trim();
}

/** Join items while preserving bold runs (detected via fontName) as
 *  **markdown** so the editor can re-apply them. Falls back to plain
 *  joinItems when no boldFont is known. */
function joinItemsAsMarkdown(items: TextItem[], boldFont: string | null): string {
  if (!items.length) return '';
  if (!boldFont) return joinItems(items);

  const sorted = [...items].sort((a, b) => a.x - b.x);
  type Tok = { text: string; bold: boolean };
  const toks: Tok[] = [];
  let prevEnd = -Infinity;

  for (const it of sorted) {
    const isBold = it.fontName === boldFont;
    if (toks.length) {
      const gap = it.x - prevEnd;
      const last = toks[toks.length - 1];
      if (gap > 1.2 && !/\s$/.test(last.text) && !/^\s/.test(it.str)) {
        toks.push({ text: ' ', bold: last.bold && isBold });
      }
    }
    toks.push({ text: it.str, bold: isBold });
    prevEnd = it.x + it.width;
  }

  // Merge consecutive same-bold tokens.
  const merged: Tok[] = [];
  for (const t of toks) {
    const last = merged[merged.length - 1];
    if (last && last.bold === t.bold) last.text += t.text;
    else merged.push({ ...t });
  }

  // Emit, putting leading/trailing whitespace OUTSIDE the ** markers.
  let result = '';
  for (const t of merged) {
    if (!t.text) continue;
    if (t.bold) {
      const m = t.text.match(/^(\s*)([\s\S]*?)(\s*)$/);
      if (m && m[2]) result += m[1] + '**' + m[2] + '**' + m[3];
      else result += t.text;
    } else {
      result += t.text;
    }
  }
  return result
    .replace(/\s+/g, ' ')
    .replace(/\b(\d+)\s+(nd|rd|th|st)\b/gi, '$1$2')
    .trim();
}

/** Detect the bold font name by counting characters per fontName. The
 *  font with the most characters is "regular"; the next-most is "bold".
 *  Falls back to null when only one font is present. */
function detectBoldFont(lines: PdfLine[]): string | null {
  const counts = new Map<string, number>();
  for (const l of lines) {
    for (const it of l.items) {
      if (it.str.trim().length === 0) continue;
      if (!it.fontName) continue;
      counts.set(it.fontName, (counts.get(it.fontName) ?? 0) + it.str.length);
    }
  }
  if (counts.size < 2) return null;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[1][0];
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
    if (t.startsWith(a)) return a;
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

function classifyLines(
  lines: PdfLine[],
  bulletX: number,
  yearX: number,
  boldFont: string | null = null
): RowParts[] {
  const TOL = 6;
  const rows: RowParts[] = lines.map((l) => {
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
      midText: joinItemsAsMarkdown(midItems, boldFont),
      rightText: joinItems(rightItems),
      hasBulletGlyph: startsWithBullet(midItems),
    };
  });

  // Re-attach orphan superscript rows. pdfjs sometimes emits "nd" / "rd"
  // / "th" / "st" on their own y-line a few pt above the digit they
  // belong to. Those rows land in the mid-column as midText that is
  // ONLY a superscript suffix. Instead of dropping them, merge their
  // items into the next bullet row below; joinItems' ordinal-collapse
  // regex then glues "2 nd" back to "2nd".
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.midText) continue;
    const pureSuper = ORPHAN_SUPERSCRIPT_RE.test(
      r.midText.replace(/\*\*/g, '').trim()
    );
    if (!pureSuper) continue;
    const maxLookahead = Math.min(rows.length, i + 4);
    for (let j = i + 1; j < maxLookahead; j++) {
      const target = rows[j];
      if (target.midItems.length === 0) continue;
      const targetSuper = ORPHAN_SUPERSCRIPT_RE.test(
        target.midText.replace(/\*\*/g, '').trim()
      );
      if (targetSuper) continue;
      target.midItems = [...target.midItems, ...r.midItems];
      target.midText = joinItemsAsMarkdown(target.midItems, boldFont);
      r.midItems = [];
      r.midText = '';
      break;
    }
  }

  return rows;
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

  const boldFont = detectBoldFont(lines);
  const rows = classifyLines(lines, bulletX, yearX, boldFont);

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

  const boldFont = detectBoldFont(lines);
  const rows = classifyLines(lines, bulletX, yearX, boldFont);
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

  // Rotated runs in the left margin group the entries: Full Time / Intern / Others.
  // A rotated label's y-anchor frequently lands within groupIntoLines' y-tolerance
  // of an unrelated bullet row (it is a single pdfjs item whose "height" runs
  // sideways down the margin, not a full line of its own), so the rotated items
  // must be pulled out of whatever line they landed in rather than assumed to
  // occupy a line by themselves.
  const marginLabels: { y: number; text: string; width: number }[] = [];
  const bodyLines: PdfLine[] = [];
  for (const l of lines) {
    const rotItems = l.items.filter((it) => it.rotated);
    if (rotItems.length) {
      marginLabels.push({
        y: rotItems[0].y,
        text: joinItems(rotItems).trim(),
        // Sum of the rotated items' own advance widths: an approximation of
        // how far the label's rendered glyphs run along its (vertical, once
        // rotated) reading direction. See the long comment at the call site
        // below for why this is NOT the same as the visual bracket it labels.
        width: rotItems.reduce((sum, it) => sum + it.width, 0),
      });
    }
    const items = l.items.filter((it) => !it.rotated);
    if (!items.length) continue;
    bodyLines.push({
      y: l.y,
      startX: Math.min(...items.map((it) => it.x)),
      endX: Math.max(...items.map((it) => it.x + it.width)),
      height: Math.max(...items.map((it) => it.height)),
      items,
      text: joinItems(items),
    });
  }

  const info = findBulletXInfo(bodyLines);
  if (!info) return { entries: [], rightText };
  const { x: bulletX, glyphMode } = info;
  // Skynet's Industry Experience has no year column — bullets run the full
  // width to x≈575 and dates live on the firm banner row. Dates are on the
  // firm banner row instead. Setting yearX = Infinity ensures all items stay
  // in the mid column; do not call findYearX() here, as it would latch onto
  // digits inside bullet text and incorrectly clip them at ~547.
  const yearX = Infinity;
  const lineHeight = findLineHeight(bodyLines);
  const sameLabelGap = lineHeight * 1.15;
  const boldFont = detectBoldFont(bodyLines);

  const rows = classifyLines(bodyLines, bulletX, yearX, boldFont);

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

  // ---- Assign each block a margin-label type. -----------------------------
  //
  // Attempt 1 (as specified): direct span containment. A rotated label is a
  // single pdfjs text item anchored at one y with an advance `width` along
  // its own (rotated) reading direction. That span is the label's OWN glyph
  // footprint — NOT the visual bracket that groups its firm(s). Measured on
  // skynet-d (MBA/9005/63, source corpus-resume-D.pdf — ground
  // truth confirmed by rendering the actual PDF page, not by trusting the
  // parser's own output): "Full Time" anchors at y=395.14 with width=36.72,
  // so its derived span is [358.42, 431.86] — yet the firm it labels (ZS
  // Associates) has its banner at y=474.43 and its last bullet at y=350.25;
  // neither endpoint is inside that ~37pt span. The label's own glyph span
  // is only ever large enough to coincidentally contain a firm banner that
  // happened to land on the same PdfLine as the label itself (the merge case
  // handled above) — it can never contain the banner of a firm that isn't
  // adjacent to the label's own anchor. So containment is tried first, per
  // block, for that narrow case, but it is expected to leave every
  // multi-firm block unresolved, and it does on every fixture in this repo.
  //
  // Attempt 2 (fallback): NOT plain "nearest single anchor" — that is
  // provably wrong. A label vertically centered over N>1 firms anchors near
  // that GROUP's centre, not near any individual firm's banner row, so a
  // firm at the group's edge can end up nearer a *different* label's anchor
  // by a hair. Measured on skynet-d: "ADM Group" (banner y=330.99) is
  // 64.15pt from the "Full Time" anchor (395.14) and 64.50pt from "Intern"
  // (266.49) — a 0.35pt margin — yet ADM Group ("Senior Executive Intern")
  // is visually bracketed under "Intern", confirmed against the rendered
  // PDF. Naive nearest-anchor picks "Full Time": wrong, and user-visible in
  // the exported resume.
  //
  // Instead, partition the ordered blocks into as many contiguous,
  // non-empty, ordered groups as there are margin labels (the table layout
  // never interleaves labels — enforced structurally by block order, not by
  // text), and pick the partition whose per-group "extent midpoint"
  // ((topmost + bottommost row y, across every banner and body row assigned
  // to that group) / 2) is jointly closest — least total absolute error — to
  // the corresponding label's own y anchor. This is still fundamentally a
  // nearest-anchor comparison; it is solved jointly across the whole block
  // sequence instead of independently per block, which is what makes it
  // correct for multi-firm groups. Verified on skynet-d: the true split (ZS
  // Associates alone under "Full Time"; ADM Group + Jayesh P Desai & Co.
  // under "Intern") scores total error 28.4 against the (wrong) alternative
  // split's 34.5 — so this is not a tie the way per-block nearest-anchor
  // was.
  const labelsTopDown = [...marginLabels].sort((a, b) => b.y - a.y);

  function spanContains(label: { y: number; width: number }, y: number): boolean {
    return y >= label.y - label.width && y <= label.y + label.width;
  }

  /** All possible ways to split `n` ordered items into `k` contiguous,
   *  non-empty groups, expressed as the (k-1) indices to split before. */
  function* contiguousSplits(n: number, k: number): Generator<number[]> {
    function* rec(start: number, chosen: number[]): Generator<number[]> {
      if (chosen.length === k - 1) {
        yield chosen;
        return;
      }
      for (let i = start; i <= n - 1; i++) yield* rec(i + 1, [...chosen, i]);
    }
    yield* rec(1, []);
  }

  let types: string[];
  if (labelsTopDown.length === 0) {
    types = blocks.map(() => '');
  } else if (labelsTopDown.length === 1) {
    types = blocks.map(() => labelsTopDown[0].text);
  } else if (labelsTopDown.length > blocks.length) {
    // Degenerate: more margin labels than firm blocks — a clean contiguous
    // partition isn't possible (not observed in this corpus). Fall back to
    // per-block nearest-anchor rather than fail outright; this is the one
    // place plain nearest-y — known imperfect — is still used.
    types = blocks.map((b) => {
      let best = labelsTopDown[0];
      for (const m of labelsTopDown) {
        if (Math.abs(m.y - b.banner.y) < Math.abs(best.y - b.banner.y)) best = m;
      }
      return best.text;
    });
  } else {
    types = blocks.map((b) => {
      const hit = labelsTopDown.find((m) => spanContains(m, b.banner.y));
      return hit ? hit.text : '';
    });
    if (types.some((t) => !t)) {
      const blockRowYs = blocks.map((b) => [b.banner.y, ...b.body.map((r) => r.y)]);
      let bestSplit: number[] | null = null;
      let bestCost = Infinity;
      for (const split of contiguousSplits(blocks.length, labelsTopDown.length)) {
        const bounds = [0, ...split, blocks.length];
        let cost = 0;
        for (let g = 0; g < labelsTopDown.length; g++) {
          const rows = blockRowYs.slice(bounds[g], bounds[g + 1]).flat();
          if (!rows.length) {
            cost = Infinity;
            break;
          }
          const mid = (Math.max(...rows) + Math.min(...rows)) / 2;
          cost += Math.abs(mid - labelsTopDown[g].y);
        }
        if (cost < bestCost) {
          bestCost = cost;
          bestSplit = split;
        }
      }
      if (bestSplit) {
        const bounds = [0, ...bestSplit, blocks.length];
        for (let g = 0; g < labelsTopDown.length; g++) {
          for (let i = bounds[g]; i < bounds[g + 1]; i++) types[i] = labelsTopDown[g].text;
        }
      }
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
    const dm = fullBanner.match(DATE_RANGE_RE);
    const dates = dm ? dm[0] : '';

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
      type: types[i],
      firm,
      role,
      dates,
      subSections: subSections.filter((s) => s.bullets.length > 0 || s.label),
    };
  });

  return { entries, rightText };
}

/* ------------------------------- education ------------------------------- */

function parseEducation(lines: PdfLine[]): { rows: EducationRow[]; ranked: boolean } {
  // Detect ranked variant by inspecting the header row for a "Rank" cell.
  const ranked = lines.some((l) => {
    const t = l.text.toLowerCase().replace(/\s+/g, ' ');
    return /degree/.test(t) && /board|institute/.test(t) && /\brank\b/.test(t);
  });

  const filtered = lines.filter((l) => {
    const t = l.text.toLowerCase();
    return (
      !/^degree\/exam/.test(t) &&
      !/^board\/institute/.test(t) &&
      !/^%\/cgpa/.test(t) &&
      !/^rank$/.test(t) &&
      !/^year$/.test(t) &&
      !/degree.*board.*cgpa/.test(t)
    );
  });
  if (!filtered.length) return { rows: [], ranked };

  const maxCells = ranked ? 5 : 4;
  const rows: EducationRow[] = [];
  for (const line of filtered) {
    const cells = splitByTopGaps(line.items, maxCells, 5);
    if (cells.length < 2) continue;
    if (ranked) {
      const [degree = '', institute = '', gpa = '', , year = ''] = cells;
      if (!degree && !institute && !gpa && !year) continue;
      if (/degree/i.test(degree) && /board|institute/i.test(institute)) continue;
      rows.push({ degree, institute, gpa, year });
    } else {
      const [degree = '', institute = '', gpa = '', year = ''] = cells;
      if (!degree && !institute && !gpa && !year) continue;
      if (/degree/i.test(degree) && /board|institute/i.test(institute)) continue;
      rows.push({ degree, institute, gpa, year });
    }
  }
  if (rows.length > 8) {
    console.warn(`parseEducation: ${rows.length} rows found, truncating to 8`);
  }
  return { rows: rows.slice(0, 8), ranked };
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

export interface ParseResult {
  data: Partial<SkynetResumeData>;
  failedSections: string[];
}

function trySection<T>(name: string, fn: () => T, fallback: T, failed: string[]): T {
  try {
    return fn();
  } catch (e) {
    console.warn(`parseResume: section "${name}" failed`, e);
    failed.push(name);
    return fallback;
  }
}

export function parseResume(lines: PdfLine[]): ParseResult {
  const failed: string[] = [];
  let split: ReturnType<typeof splitSections>;
  try {
    split = splitSections(lines);
  } catch (e) {
    console.warn('parseResume: splitSections failed', e);
    return { data: {}, failedSections: ['document'] };
  }
  const { header, sections } = split;
  const getSection = (name: string) => sections.find((s) => s.name === name);

  const headerInfo = trySection(
    'header',
    () => parseHeader(header),
    { name: '', mbaId: '', taglines: ['', '', ''] as [string, string, string] },
    failed
  );
  const footer = trySection(
    'footer',
    () => parseFooter(lines),
    { email: '', institute: 'Indian Institute of Management Calcutta' },
    failed
  );
  const edu = trySection(
    'education',
    () => parseEducation(getSection('ACADEMIC PROFILE')?.lines ?? []),
    { rows: [], ranked: false },
    failed
  );
  const distinctions = trySection(
    'distinctions',
    () =>
      parseBulletTable(
        getSection('ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS')?.lines ?? []
      ),
    [],
    failed
  );
  const projects = trySection(
    'projects',
    () => parseBulletTable(getSection('PROJECTS AND PAPERS')?.lines ?? []),
    [],
    failed
  );
  const entrepreneurial = trySection(
    'entrepreneurial',
    () => parseBulletTable(getSection('ENTREPRENEURIAL/NON-PROFIT VENTURE')?.lines ?? []),
    [],
    failed
  );
  const industrySec = getSection('INDUSTRY EXPERIENCE');
  const industry = trySection(
    'industry',
    () => parseIndustry(industrySec?.lines ?? [], industrySec?.headerRest ?? ''),
    { entries: [], rightText: '' },
    failed
  );
  const positions = trySection(
    'positions',
    () => parsePositions(getSection('POSITION OF RESPONSIBILITY')?.lines ?? []),
    [],
    failed
  );
  const extras = trySection(
    'extras',
    () => parseBulletTable(getSection('EXTRA-CURRICULAR ACHIEVEMENTS')?.lines ?? []),
    [],
    failed
  );

  // Order follows the document; sections the document omits start hidden.
  const present = sections
    .map((s) => ANCHOR_TO_KEY[s.name])
    .filter((k): k is SectionKey => Boolean(k));
  const seenKeys = new Set(present);
  const sectionOrder: SectionKey[] = [...present];
  const hiddenSections: SectionKey[] = [];
  for (const k of DEFAULT_SECTION_ORDER) {
    if (!seenKeys.has(k)) {
      sectionOrder.push(k);
      hiddenSections.push(k);
    }
  }

  return {
    data: {
      name: headerInfo.name,
      mbaId: headerInfo.mbaId,
      taglines: headerInfo.taglines,
      sectionOrder,
      hiddenSections,
      projects,
      entrepreneurial,
      education: edu.rows,
      distinctions,
      experience: industry.entries,
      industryRightText: industry.rightText,
      positions,
      extras,
      email: footer.email,
      institute: footer.institute,
    },
    failedSections: failed,
  };
}
