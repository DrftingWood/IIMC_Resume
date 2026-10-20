/**
 * Lays out a Skynet (62nd batch onward) resume as drawing operations, using
 * the official template's own geometry rather than a browser's.
 *
 * Every number here was measured from the PDFs the official system exports
 * (drawings and glyph positions read with PyMuPDF), not tuned by eye. The
 * model those files follow is simple and exact:
 *   - a row is 14.625pt of content, and a ruled line adds 0.75pt on top of
 *     it (three rows between rules measure 44.63pt, four 59.25pt);
 *   - text sits on a baseline 10.70pt below the top of its row;
 *   - each section starts 3pt below the rule that closes the one before.
 * Coordinates are in points with y running DOWN the page; the renderer
 * flips them for PDF.
 */
import type { Density } from '@/lib/density';
import { withoutHidden } from '@/lib/visibility';
import { isCustomKey } from '@/lib/customSections';
import type { BulletGroup, ExperienceEntry, SectionKey, SkynetResumeData } from '@/templates/skynet/types';
import { DEFAULT_SECTION_ORDER, sectionLabel } from '@/templates/skynet/types';

export type FontKind = 'regular' | 'bold';
export type Rgb = [number, number, number];

export type Op =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; color: Rgb }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; color: Rgb }
  | {
      kind: 'text';
      x: number;
      /** Baseline, measured down from the top of the page. */
      y: number;
      text: string;
      font: FontKind;
      size: number;
      color: Rgb;
      charSpacing?: number;
      /** 90 = rotated to read bottom to top. */
      rotate?: number;
    }
  | { kind: 'image'; x: number; y: number; w: number; h: number }
  | { kind: 'link'; x: number; y: number; w: number; h: number; uri: string };

/** Width of `text` set in `font` at `size`, without character spacing. */
export type Measure = (text: string, font: FontKind, size: number) => number;

export const PAGE_W = 595;
export const PAGE_H = 842;

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [1, 1, 1];
const DARK: Rgb = [0x2c / 255, 0x2c / 255, 0x2c / 255];
const GREY: Rgb = [0xdd / 255, 0xdd / 255, 0xdd / 255];
const TAGLINE_TEXT: Rgb = [0xf9 / 255, 0xf9 / 255, 0xf9 / 255];
const LINK_BLUE: Rgb = [0, 0, 1];

const RULE = 0.75;
const HALF = RULE / 2;
/** Outer frame: its rules span 15.75-16.50 and 578.50-579.25. */
const OUT_L = 15.75;
const OUT_R = 579.25;
const IN_L = 16.5;
const IN_R = 578.5;
/** Centres of the outer frame rules, used to centre cell text. */
const FRAME_L = 16.125;
const FRAME_R = 578.875;

const BODY = 9.9;
const HEAD = 11.25;
const SUP = 8.25;
const SUP_RISE = 3.27;
const FOOT = 8.25;

/** Measured from the official exports; see the file comment. */
const ROW = 14.625;
const BASELINE = 10.7;
/** Space the official template leaves above and below each Industry sub-section. */
const SUB_PAD = 1.5;
const SECTION_GAP = 3;
const BAR = 16.12;
const BAR_BASELINE = 11.91;

/** Bullet tables: label | point | year, split by rules at these x. */
const COL_LABEL_RULE = 100.8;
const COL_YEAR_RULE = 548.13;
/** The ■ glyph is a 2.58pt square, 7.93pt right of the label rule and
    2.13-4.71pt above the text baseline; the text starts 12.38pt in. */
const SQUARE = 2.58;
const SQUARE_DX = 7.93;
const SQUARE_BOTTOM = 2.13;
const TEXT_DX = 12.38;
/** Carlito's ▪ (U+25AA): ink 0.2544em square, from x 0.0498em and from
    0.1909em above the baseline. At this size its ink is the 2.58pt square. */
const BULLET_CHAR = String.fromCharCode(0x25aa);
const BULLET_SIZE = SQUARE / (521 / 2048);
const BULLET_INK_LEFT = 102 / 2048;
const BULLET_INK_BOTTOM = 391 / 2048;
/** Labels sit 1.15pt right of their column's centre in every export. */
const LABEL_NUDGE = 1.15;
/** The institute logo's width as the template places it (15.75-173.53pt). */
const LOGO_W = 157.78;
/** Smallest size a one-line field shrinks to before it is cut short. */
const MIN_SIZE = 6;
const ELLIPSIS = String.fromCharCode(0x2026);
/** Room for year text between the year rule and the frame. */
const YEAR_W = 29.5;

/** Industry Experience: the official template adds 0.15pt of character spacing. */
const INDUSTRY_TC = 0.15;
const RAIL_RULE = 30.39;
const RAIL_LABEL_X = 26.58;
const RAIL_LABEL_SIZE = 9.75;
const INDUSTRY_LABEL_RULE_RAIL = 100.89;

/** Row height per density. Compact modes are opt-in and not the official
    format; they tighten only the row, as the on-screen preview does. */
export function rowHeight(d: Density | undefined): number {
  if (d === 'compact40') return ROW - 0.6;
  if (d === 'compact45') return ROW - 1.7;
  return ROW;
}

/* ------------------------------ inline text ------------------------------ */

interface Run {
  text: string;
  bold: boolean;
  sup: boolean;
}

/** "**bold** 1st" -> runs, with ordinal suffixes as superscripts, the way the
    preview renders them (src/lib/bold.tsx). */
export function inlineRuns(md: string, baseBold = false): Run[] {
  const runs: Run[] = [];
  const pushOrdinals = (text: string, bold: boolean) => {
    const re = /(\d+)(st|nd|rd|th)\b/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const head = text.slice(last, m.index) + m[1];
      if (head) runs.push({ text: head, bold, sup: false });
      runs.push({ text: m[2], bold, sup: true });
      last = m.index + m[0].length;
    }
    if (last < text.length) runs.push({ text: text.slice(last), bold, sup: false });
  };
  const re = /\*\*(.+?\**)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    if (m.index > last) pushOrdinals(md.slice(last, m.index), baseBold);
    pushOrdinals(m[1], true);
    last = m.index + m[0].length;
  }
  if (last < md.length) pushOrdinals(md.slice(last), baseBold);
  // A combining accent typed just after a bold run ("Caf**e**" + acute)
  // belongs to the letter before it; keep it in that run.
  for (let i = 1; i < runs.length; i++) {
    const m = runs[i].text.match(/^\p{M}+/u);
    if (m) {
      runs[i - 1].text += m[0];
      runs[i].text = runs[i].text.slice(m[0].length);
    }
  }
  return runs.filter((r) => r.text);
}

interface Piece extends Run {
  w: number;
}

/** A set line; `squeeze` is how much each inter-word space gives up. */
type Line = Piece[] & { squeeze?: number };

/** Most a space may shrink to keep a line whole (the exports show ~17%). */
const SQUEEZE = 0.2;
/** A row holding a superscript is this much taller in every official export
    (7 of 7 such rows across 40 resumes, 0 exceptions). */
const SUP_EXTRA = 0.56;

class Typesetter {
  constructor(
    private measure: Measure,
    private sanitize: (s: string) => string
  ) {}

  clean(s: string): string {
    return this.sanitize(s);
  }

  width(text: string, font: FontKind, size: number, tc = 0): number {
    return this.measure(text, font, size) + tc * Array.from(text).length;
  }

  private pieceWidth(r: Run, size: number, tc: number): number {
    return this.width(r.text, r.bold ? 'bold' : 'regular', r.sup ? SUP * (size / BODY) : size, tc);
  }

  /** Width of the inter-word spaces a line could give up, and how many. */
  private spaces(ps: Piece[], size: number, tc: number): { n: number; w: number } {
    let n = 0;
    let w = 0;
    const body = ps.map((p) => p.text).join('').replace(/ +$/, '');
    let k = 0;
    for (const p of ps) {
      for (const ch of p.text) {
        if (k++ >= body.length) break;
        if (ch === ' ') {
          n++;
          w += this.pieceWidth({ ...p, text: ' ' }, size, tc);
        }
      }
    }
    return { n, w };
  }

  /** A word wider than the whole line is broken between characters, as
      Word does, instead of running past the cell. */
  private breakLongWord(atom: Piece[], maxW: number, size: number, tc: number): Piece[][] {
    const w = atom.reduce((a, p) => a + p.w, 0);
    if (w <= maxW) return [atom];
    const out: Piece[][] = [];
    let cur: Piece[] = [];
    let curW = 0;
    for (const p of atom) {
      for (const ch of Array.from(p.text)) {
        const cw = this.pieceWidth({ ...p, text: ch }, size, tc);
        if (cur.length && curW + cw > maxW && ch !== ' ') {
          out.push(cur);
          cur = [];
          curW = 0;
        }
        const last = cur[cur.length - 1];
        if (last && last.bold === p.bold && last.sup === p.sup) {
          last.text += ch;
          last.w += cw;
        } else cur.push({ ...p, text: ch, w: cw });
        curW += cw;
      }
    }
    if (cur.length) out.push(cur);
    return out;
  }

  /** Greedy word wrap, as Word does: break at spaces, never inside a word
      unless the word alone is wider than the line. A line that overflows
      only slightly stays whole with its spaces squeezed, as the official
      exports do (2.24pt spaces set at 1.87pt): up to SQUEEZE of the space. */
  wrap(runs: Run[], maxW: number, size: number, tc = 0, breakWords = true): Line[] {
    const atoms: Piece[][] = [];
    let cur: Piece[] = [];
    for (const r of runs) {
      const parts = this.clean(r.text).split(/(?<= )/);
      for (const part of parts) {
        if (!part) continue;
        cur.push({ ...r, text: part, w: this.pieceWidth({ ...r, text: part }, size, tc) });
        if (part.endsWith(' ')) {
          atoms.push(cur);
          cur = [];
        }
      }
    }
    if (cur.length) atoms.push(cur);

    const inkWidth = (ps: Piece[]) => {
      // Trailing spaces do not count against the line, as in Word.
      let w = ps.reduce((a, p) => a + p.w, 0);
      const last = ps[ps.length - 1];
      if (last && / +$/.test(last.text)) {
        const trimmed = last.text.replace(/ +$/, '');
        w -= last.w - this.pieceWidth({ ...last, text: trimmed }, size, tc);
      }
      return w;
    };
    const fits = (ps: Piece[]) => {
      const over = inkWidth(ps) - maxW;
      return over <= 0 || over <= this.spaces(ps, size, tc).w * SQUEEZE;
    };
    const finish = (ps: Piece[]): Line => {
      const line = ps as Line;
      const over = inkWidth(ps) - maxW;
      if (over > 0) {
        const sp = this.spaces(ps, size, tc);
        if (sp.n) line.squeeze = Math.min(over, sp.w * SQUEEZE) / sp.n;
      }
      return line;
    };

    const lines: Line[] = [];
    let line: Piece[] = [];
    for (const whole of atoms) {
      for (const atom of breakWords ? this.breakLongWord(whole, maxW, size, tc) : [whole]) {
      if (line.length && !fits([...line, ...atom])) {
        lines.push(finish(line));
        line = [];
      }
      line.push(...atom);
      }
    }
    if (line.length || !lines.length) lines.push(finish(line));
    return lines;
  }
}

/* -------------------------------- layout --------------------------------- */

export interface LayoutResult {
  ops: Op[];
  /** Lowest point anything reaches, in points from the top. */
  bottom: number;
}

export function layoutSkynet(
  draft: SkynetResumeData,
  measure: Measure,
  sanitize: (s: string) => string = (s) => s,
  opts: { logo?: boolean } = {}
): LayoutResult {
  const data = withoutHidden(draft);
  const ts = new Typesetter(measure, sanitize);
  const ops: Op[] = [];
  const rowH = rowHeight(data.density);
  const base = BASELINE - (ROW - rowH) / 2;

  const rect = (x: number, y: number, w: number, h: number, color: Rgb) =>
    ops.push({ kind: 'rect', x, y, w, h, color });
  const hline = (y: number, x1 = IN_L, x2 = IN_R) =>
    ops.push({ kind: 'line', x1, y1: y, x2, y2: y, width: RULE, color: BLACK });
  const vline = (x: number, y1: number, y2: number) =>
    ops.push({ kind: 'line', x1: x, y1, x2: x, y2, width: RULE, color: BLACK });
  const text = (
    s: string,
    x: number,
    y: number,
    font: FontKind,
    size: number,
    color: Rgb = BLACK,
    extra: { charSpacing?: number; rotate?: number } = {}
  ) => {
    const t = ts.clean(s);
    if (t) ops.push({ kind: 'text', x, y, text: t, font, size, color, ...extra });
  };
  const centred = (s: string, cx: number, y: number, font: FontKind, size: number, color: Rgb = BLACK) =>
    text(s, cx - ts.width(ts.clean(s), font, size) / 2, y, font, size, color);

  /**
   * A one-line field (tagline, year, banner, name, title...) set to fit
   * `maxW`: at the template's size when it fits, else just small enough, and
   * below MIN_SIZE cut short with an ellipsis. Nothing ever crosses a rule
   * or the page edge, however long the student's text.
   */
  const fitted = (s: string, font: FontKind, size: number, maxW: number) => {
    let t = ts.clean(s);
    const w = ts.width(t, font, size);
    if (!t || w <= maxW) return { t, size, w };
    // Width scales with size, but rounding can leave the scaled text a hair
    // over; nudge down rather than fall through to cutting it short.
    let shrunk = Math.max(MIN_SIZE, (size * Math.max(maxW, 0)) / w);
    while (shrunk > MIN_SIZE && ts.width(t, font, shrunk) > maxW) shrunk = Math.max(MIN_SIZE, shrunk * 0.995);
    if (ts.width(t, font, shrunk) <= maxW) return { t, size: shrunk, w: ts.width(t, font, shrunk) };
    const chars = Array.from(t);
    while (chars.length && ts.width(chars.join('') + ELLIPSIS, font, shrunk) > maxW) chars.pop();
    t = chars.length ? chars.join('').trimEnd() + ELLIPSIS : '';
    return { t, size: shrunk, w: ts.width(t, font, shrunk) };
  };
  /** The bullet, as a real glyph so the PDF's text reads like the official
      one (and re-imports with its points intact), with its ink placed on the
      official ■: a SQUARE-wide square whose left edge is at `inkLeft` and
      whose bottom sits SQUARE_BOTTOM above the text baseline `b`. */
  const bullet = (inkLeft: number, b: number) =>
    ops.push({
      kind: 'text',
      x: inkLeft - BULLET_INK_LEFT * BULLET_SIZE,
      y: b - SQUARE_BOTTOM + BULLET_INK_BOTTOM * BULLET_SIZE,
      text: BULLET_CHAR,
      font: 'regular',
      size: BULLET_SIZE,
      color: BLACK,
    });
  const push = (t: string, x: number, y: number, font: FontKind, size: number, color: Rgb) => {
    if (t) ops.push({ kind: 'text', x, y, text: t, font, size, color });
  };
  const leftFit = (s: string, x: number, maxW: number, y: number, font: FontKind, size: number, color: Rgb = BLACK) => {
    const f = fitted(s, font, size, maxW);
    push(f.t, x, y, font, f.size, color);
    return f;
  };
  const centredFit = (s: string, cx: number, maxW: number, y: number, font: FontKind, size: number, color: Rgb = BLACK) => {
    const f = fitted(s, font, size, maxW);
    push(f.t, cx - f.w / 2, y, font, f.size, color);
    return f;
  };
  const rightFit = (s: string, right: number, maxW: number, y: number, font: FontKind, size: number, color: Rgb = BLACK) => {
    const f = fitted(s, font, size, maxW);
    push(f.t, right - f.w, y, font, f.size, color);
    return f;
  };

  const lineH = (l: Line) => rowH + (l.some((p) => p.sup) ? SUP_EXTRA : 0);

  /** One line of mixed bold/regular text with superscripts. */
  const drawPieces = (line: Line, x: number, y: number, size: number, tc: number) => {
    let cx = x;
    // Merge neighbours that share a style so the PDF holds whole words.
    const merged: Piece[] = [];
    for (const p of line) {
      const prev = merged[merged.length - 1];
      if (prev && prev.bold === p.bold && prev.sup === p.sup) {
        prev.text += p.text;
        prev.w += p.w;
      } else merged.push({ ...p });
    }
    const squeeze = line.squeeze ?? 0;
    for (const p of merged) {
      const sz = p.sup ? SUP * (size / BODY) : size;
      const font: FontKind = p.bold ? 'bold' : 'regular';
      const put = (t: string, at: number) =>
        ops.push({
          kind: 'text',
          x: at,
          y: p.sup ? y - SUP_RISE * (size / BODY) : y,
          text: t,
          font,
          size: sz,
          color: BLACK,
          ...(tc ? { charSpacing: tc } : {}),
        });
      if (!squeeze || !p.text.includes(' ')) {
        put(p.text, cx);
        cx += p.w;
        continue;
      }
      // Squeezed line: set word by word, each space a little narrower.
      // (PDF word spacing cannot do this: it ignores two-byte fonts.)
      const space = ts.width(' ', font, sz, tc);
      for (const part of p.text.split(/( )/)) {
        if (part === ' ') cx += space - squeeze;
        else if (part) {
          put(part, cx);
          cx += ts.width(part, font, sz, tc);
        }
      }
    }
  };

  /** Label lines: the student's own line breaks, each wrapped to the column.
      A single word too wide for it stays whole, as Word keeps it (no extra
      line and row); drawLabel shrinks that line to fit the cell. */
  const labelLines = (label: string, width: number): string[] =>
    (label || '')
      .split('\n')
      .flatMap((l) => ts.wrap([{ text: l.trim(), bold: true, sup: false }], width, BODY, 0, false))
      .map((ps) => ps.map((p) => p.text).join('').trim())
      .filter((l, i, all) => l || all.length === 1);

  /** Lines centred vertically on the mean of the rows' baselines. */
  const drawLabel = (lines: string[], cx: number, top: number, h: number, maxW: number) => {
    const n = lines.length;
    if (!n || (n === 1 && !lines[0])) return;
    const mid = top + h / 2 - rowH / 2 + base;
    lines.forEach((l, i) => centredFit(l, cx, maxW, mid + (i - (n - 1) / 2) * rowH, 'bold', BODY));
  };

  /* Header: the official logo, the name and MBA ID right-aligned. */
  // The institute logo prints only when the owner's switch is on.
  // On the left edge as in the template, or mirrored to the right edge when
  // the student puts their name on the left.
  if (opts.logo) {
    const x = data.nameAlign === 'left' ? OUT_R - LOGO_W : OUT_L;
    ops.push({ kind: 'image', x, y: 3.0, w: LOGO_W, h: 38.66 });
  }
  // Name and MBA ID: right-aligned on the frame's outer edge, as the official
  // template sets them, or (the student's choice) left-aligned on the
  // opposite edge, with the logo (when it prints) mirrored to the right.
  if (data.nameAlign === 'left') {
    // Mirrored: name on the left edge, the logo (when it prints) on the right.
    const maxW = opts.logo ? OUT_R - LOGO_W - 6 - OUT_L : OUT_R - OUT_L;
    leftFit(data.name, OUT_L, maxW, 15.6, 'bold', 12);
    leftFit(data.mbaId, OUT_L, maxW, 31.35, 'bold', 12);
  } else {
    const maxW = opts.logo ? OUT_R - 180 : OUT_R - OUT_L;
    rightFit(data.name, OUT_R, maxW, 15.6, 'bold', 12);
    rightFit(data.mbaId, OUT_R, maxW, 31.35, 'bold', 12);
  }

  /* Taglines: three dark cells, text centred, in capitals. */
  const cells: [number, number][] = [
    [15.75, 202.58],
    [204.08, 390.91],
    [392.42, 579.25],
  ];
  cells.forEach(([l, r], i) => {
    rect(l, 44.87, r - l, 16.5, DARK);
    centredFit((data.taglines?.[i] ?? '').toUpperCase(), (l + r) / 2, r - l - 4, 56.97, 'bold', HEAD, TAGLINE_TEXT);
  });

  let y = 64.0; // top of the first section's frame
  /** y of the centre of the rule that closes the section just drawn. */
  let closed = y;

  const hidden = new Set(data.hiddenSections ?? []);
  const order: SectionKey[] = (
    data.sectionOrder && data.sectionOrder.length ? data.sectionOrder : DEFAULT_SECTION_ORDER
  ).filter((k) => !hidden.has(k));

  const sectionBar = (title: string, right?: string) => {
    // Every rule is a 0.75pt stroke. Word draws the frame and bar edges as
    // thin filled boxes and the gridlines as strokes; viewers render the two
    // differently, so the official file's rules look uneven on screen.
    rect(IN_L, y + 0.74, IN_R - IN_L, 15.38, DARK);
    hline(y + HALF, OUT_L, OUT_R);
    hline(y + 15.37 + HALF);
    const r = right ? rightFit(right, IN_R, 200, y + BAR_BASELINE, 'bold', HEAD, WHITE) : null;
    leftFit(title.toUpperCase(), 19.5, IN_R - 19.5 - 3 - (r?.t ? r.w + 8 : 0), y + BAR_BASELINE, 'bold', HEAD, WHITE);
    return y + BAR;
  };
  const closeFrame = (frameTop: number, lastRule: number) => {
    const end = lastRule + HALF;
    vline(OUT_L + HALF, frameTop, end);
    vline(IN_R + HALF, frameTop, end);
    closed = lastRule;
    y = lastRule + SECTION_GAP;
  };

  /* --------------------------- bullet tables ---------------------------- */
  interface Row {
    text: string;
    year: string;
  }
  const bulletTable = (top: number, groups: { label: string; rows: Row[]; yearSpan?: string }[]) => {
    let rowTop = top;
    // The bar's own bottom rule closes an empty table.
    let lastRule = top - HALF;
    const pointX = COL_LABEL_RULE + TEXT_DX;
    const pointW = COL_YEAR_RULE - HALF - pointX;
    const labelCx = (FRAME_L + COL_LABEL_RULE) / 2 + LABEL_NUDGE;
    // Centred 1.15pt right of the column's middle, so the rule side is the
    // limit: ~81.4pt, which Word's widest one-line labels (~79pt) fit.
    const labelW = 2 * (COL_LABEL_RULE - HALF - labelCx) - 0.2;
    const yearCx = (COL_YEAR_RULE + FRAME_R) / 2;
    for (const g of groups) {
      if (!g.rows.length) continue;
      const wrapped = g.rows.map((r) => ts.wrap(inlineRuns(r.text), pointW, BODY));
      const pointsH = wrapped.reduce((n, ls) => n + ls.reduce((a, l) => a + lineH(l), 0), 0);
      const label = labelLines(g.label, labelW);
      const h = Math.max(pointsH, label.length * rowH);
      rect(IN_L, rowTop, COL_LABEL_RULE - HALF - IN_L, h, GREY);
      drawLabel(label, labelCx, rowTop, h, labelW);
      let ly = rowTop;
      wrapped.forEach((lines, ri) => {
        const b = ly + base;
        if (g.rows[ri].text.trim()) {
          bullet(COL_LABEL_RULE + SQUARE_DX, b);
        }
        let lb = b;
        lines.forEach((line) => {
          drawPieces(line, pointX, lb, BODY, 0);
          lb += lineH(line);
        });
        if (!g.yearSpan) centredFit(g.rows[ri].year, yearCx, YEAR_W, b, 'regular', BODY);
        ly += lines.reduce((a, l) => a + lineH(l), 0);
      });
      if (g.yearSpan) centredFit(g.yearSpan, yearCx, YEAR_W, rowTop + h / 2 - rowH / 2 + base, 'regular', BODY);
      lastRule = rowTop + h + HALF;
      hline(lastRule);
      rowTop = lastRule + HALF;
    }
    vline(COL_LABEL_RULE, top, lastRule + HALF);
    vline(COL_YEAR_RULE, top, lastRule + HALF);
    return lastRule;
  };

  const groupsOf = (gs: BulletGroup[]) =>
    gs.map((g) => ({ label: g.category, rows: g.bullets.map((b) => ({ text: b.text, year: b.year })) }));

  /* ------------------------------ education ----------------------------- */
  const educationTable = (top: number) => {
    const rules = [213.2, 466.1, 550.4];
    const edges = [FRAME_L, ...rules, FRAME_R];
    // Word's cell margins are ~5.4pt, but cells are filled nearly edge to
    // edge in the exports; wrap only when text truly reaches the rules.
    const cellPad = 1.5;
    const YEAR_COL = 3;
    const rows: { cells: string[]; bold: boolean }[] = [
      { cells: ['Degree/Exam', 'Board/Institute', '%/CGPA', 'Year'], bold: true },
      ...data.education.map((r) => ({ cells: [r.degree, r.institute, r.gpa, r.year], bold: false })),
    ];
    let rowTop = top;
    let lastRule = top - HALF;
    for (const row of rows) {
      // The year column is a single line that shrinks to fit; the others wrap.
      const lines = row.cells.map((c, i) =>
        i === YEAR_COL
          ? [c || '']
          : ts
              .wrap([{ text: c || '', bold: row.bold, sup: false }], edges[i + 1] - edges[i] - 2 * cellPad, BODY)
              .map((ps) => ps.map((p) => p.text).join('').trim())
      );
      const n = Math.max(...lines.map((l) => l.length));
      const h = n * rowH;
      edges.slice(0, -1).forEach((l, i) => {
        const left = i === 0 ? IN_L : l + HALF;
        const right = i === edges.length - 2 ? IN_R : edges[i + 1] - HALF;
        rect(left, rowTop, right - left, h, GREY);
      });
      lines.forEach((ls, i) => {
        const cx = (edges[i] + edges[i + 1]) / 2;
        const first = rowTop + h / 2 - (ls.length * rowH) / 2;
        const font: FontKind = row.bold ? 'bold' : 'regular';
        const maxW = edges[i + 1] - edges[i] - 2 * cellPad;
        ls.forEach((l, li) => centredFit(l, cx, maxW, first + li * rowH + base, font, BODY));
      });
      lastRule = rowTop + h + HALF;
      hline(lastRule);
      rowTop = lastRule + HALF;
    }
    rules.forEach((x) => vline(x, top, lastRule + HALF));
    return lastRule;
  };

  /* ------------------------------ industry ------------------------------ */
  const industryTable = (top: number, entries: ExperienceEntry[]) => {
    const rail = entries.some((e) => e.type.trim());
    const inner = rail ? RAIL_RULE + HALF : IN_L;
    const labelRule = rail ? INDUSTRY_LABEL_RULE_RAIL : COL_LABEL_RULE;
    const roleX = rail ? 261.22 : 253.26;
    const datesRight = rail ? 573.25 : 574.0;
    const pointX = labelRule + TEXT_DX;
    const pointW = IN_R - pointX - 0.5;
    const labelCx = (inner - HALF + labelRule) / 2 + LABEL_NUDGE;
    const labelW = 2 * (labelRule - HALF - labelCx) - 0.2;

    let rowTop = top;
    let lastRule = top - HALF;
    let railTop = top;
    let railType: string | null = null;
    const closeRail = (bottomRule: number) => {
      if (!rail || railType === null) return;
      rect(IN_L, railTop, RAIL_RULE - HALF - IN_L, bottomRule - HALF - railTop, GREY);
      const label = ts.clean(railType.trim());
      if (label) {
        const f = fitted(label, 'bold', RAIL_LABEL_SIZE, bottomRule - railTop - 4);
        const mid = (railTop + bottomRule) / 2;
        if (f.t) ops.push({ kind: 'text', x: RAIL_LABEL_X, y: mid + f.w / 2, text: f.t, font: 'bold', size: f.size, color: BLACK, rotate: 90 });
      }
    };

    entries.forEach((e, ei) => {
      if (rail && (railType === null || railType.trim() !== e.type.trim())) {
        if (railType !== null) {
          // A new type starts: close the rail cell above with its own rule.
          closeRail(lastRule);
          hline(lastRule, IN_L, inner);
        }
        railType = e.type;
        railTop = rowTop;
      }
      // Firm banner
      rect(inner, rowTop, IN_R - inner, rowH, GREY);
      const b = rowTop + base;
      // Firm left, role at the template's tab stop, dates right. A long firm
      // pushes the role along (as the preview does); a long role shrinks
      // rather than run into the dates.
      // Dates take at most 120pt; the firm runs until the role keeps 60pt.
      const dates = rightFit(e.dates, datesRight, 120, b, 'bold', BODY);
      const datesStart = datesRight - dates.w - (dates.t ? 6 : 0);
      const firmX = inner + 4.5;
      const firmMax = datesStart - (e.role.trim() ? 66 : 0) - firmX;
      const firm = leftFit(e.firm, firmX, firmMax, b, 'bold', BODY);
      const roleAt = Math.max(roleX, firm.t ? firmX + firm.w + 6 : roleX);
      leftFit(e.role, roleAt, datesStart - roleAt, b, 'bold', BODY);
      lastRule = rowTop + rowH + HALF;
      hline(lastRule, inner);
      rowTop = lastRule + HALF;

      const subTop = rowTop;
      e.subSections.forEach((sub) => {
        const bullets = sub.bullets.length ? sub.bullets : [''];
        const wrapped = bullets.map((t) => ts.wrap(inlineRuns(t), pointW, BODY, INDUSTRY_TC));
        const pointsH = wrapped.reduce((n, ls) => n + ls.reduce((a, l) => a + lineH(l), 0), 0);
        const label = labelLines(sub.label, labelW);
        const h = SUB_PAD * 2 + Math.max(pointsH, label.length * rowH);
        rect(inner, rowTop, labelRule - HALF - inner, h, GREY);
        drawLabel(label, labelCx, rowTop, h, labelW);
        let ly = rowTop + SUB_PAD;
        wrapped.forEach((lines, ri) => {
          const bl = ly + base;
          if (bullets[ri].trim()) {
            bullet(labelRule + SQUARE_DX, bl);
          }
          let lb = bl;
          lines.forEach((line) => {
            drawPieces(line, pointX, lb, BODY, INDUSTRY_TC);
            lb += lineH(line);
          });
          ly += lines.reduce((a, l) => a + lineH(l), 0);
        });
        lastRule = rowTop + h + HALF;
        hline(lastRule, inner);
        rowTop = lastRule + HALF;
      });
      if (e.subSections.length) vline(labelRule, subTop, lastRule + HALF);
      if (ei === entries.length - 1 && rail) {
        // The rail closes on the same rule as the rest of the table. (Word
        // puts the rail's rule 0.375pt lower; that step shows, so it is not
        // copied.)
        closeRail(lastRule);
        hline(lastRule, IN_L, inner);
      }
    });
    if (rail && entries.length) vline(RAIL_RULE, top, lastRule + HALF);
    return lastRule;
  };

  /* ------------------------------ sections ------------------------------ */
  for (const key of order) {
    const frameTop = y;
    const title = sectionLabel(data, key);
    let last: number;
    switch (key) {
      case 'education':
        last = educationTable(sectionBar(title));
        break;
      case 'distinctions':
      case 'projects':
      case 'entrepreneurial':
      case 'extras':
        last = bulletTable(sectionBar(title), groupsOf(data[key]));
        break;
      case 'industry':
        last = industryTable(sectionBar(title, data.industryRightText), data.experience);
        break;
      case 'positions':
        last = bulletTable(
          sectionBar(title),
          data.positions.map((p) => ({
            label: p.title,
            rows: p.bullets.map((t) => ({ text: t, year: '' })),
            yearSpan: p.year,
          }))
        );
        break;
      default: {
        const custom = isCustomKey(key) ? data.customSections?.find((c) => c.key === key) : undefined;
        if (!custom) continue;
        last = bulletTable(sectionBar(title), groupsOf(custom.groups));
      }
    }
    closeFrame(frameTop, last);
  }

  /* Footer: centred, the email in blue and underlined, linked. */
  const cx = PAGE_W / 2;
  const prefix = 'Email: ';
  const prefixW = ts.width(prefix, 'regular', FOOT);
  const trail = ts.width('  ', 'regular', FOOT);
  const mail = fitted(data.email || '', 'regular', FOOT, IN_R - IN_L - prefixW - trail);
  const x1 = cx - (prefixW + mail.w + trail) / 2;
  const b1 = closed + 11.45;
  text(prefix, x1, b1, 'regular', FOOT);
  if (mail.t) {
    const ex = x1 + prefixW;
    push(mail.t, ex, b1, 'regular', mail.size, LINK_BLUE);
    ops.push({ kind: 'line', x1: ex, y1: b1 + 0.82, x2: ex + mail.w, y2: b1 + 0.82, width: RULE, color: LINK_BLUE });
    // The link uses the address as typed (only stray whitespace removed);
    // the drawn text may have "?" for characters the font lacks, and a "?"
    // in a mailto starts a query string.
    const address = (data.email || '').replace(/\s+/g, '');
    ops.push({ kind: 'link', x: ex, y: b1 - FOOT, w: mail.w, h: FOOT + 2, uri: `mailto:${address}` });
  }
  centredFit(data.institute || '', cx, IN_R - IN_L, b1 + 11.25, 'regular', FOOT);

  // The lowest ink: the institute line's descenders (0.209em). Official
  // exports run that to the paper edge (footer baselines up to 840.26pt);
  // 0.3pt of slack lets a page filled exactly that far through, since rows
  // here can sit ~0.2pt lower than in the student's own Word file.
  return { ops, bottom: b1 + 11.25 + 0.209 * FOOT - 0.3 };
}
