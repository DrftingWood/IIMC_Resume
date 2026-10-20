import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  /** True when the glyph run is not laid out left-to-right (rotated margin labels). */
  rotated: boolean;
  /** From the embedded font's real name ("Calibri-Bold"); absent when the
      name could not be read, in which case parsers fall back to guessing. */
  bold?: boolean;
}

/** Font names that mark a bold face. Word/Chrome PDFs name subsets like
    "BCDEEE+Calibri-Bold"; semibold counts, as it prints visibly bold. */
const BOLD_NAME_RE = /bold|black|heavy|semibold|demibold/i;

/** y (PDF space, bottom-up) of each horizontal ruled line on page 1 that
    crosses the label column. Table rows are separated by these; text alone
    cannot tell two stacked labels from one two-line label. */
export interface WithRules {
  hRules?: number[];
  /** Short rules across only the Industry type rail (x ~16-31pt): one closes
      each Full Time / Intern group. */
  railRules?: number[];
}

export interface PdfLine {
  y: number;
  startX: number;
  endX: number;
  height: number;
  items: TextItem[];
  text: string;
}

export async function extractTextItems(file: File): Promise<TextItem[] & WithRules> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const items: TextItem[] & WithRules = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // The text layer only carries internal font ids (g_d0_f3). Loading the
    // operator list resolves each id to its embedded font, whose real name
    // says whether it is bold - exact, unlike guessing from glyph widths
    // (bold Calibri is only ~5% wider, and digits skew that).
    const boldById = new Map<string, boolean>();
    try {
      const opList = await page.getOperatorList();
      if (p === 1) {
        items.hRules = horizontalRules(opList.fnArray, opList.argsArray);
        items.railRules = horizontalRules(opList.fnArray, opList.argsArray, 'rail');
      }
      for (const it of content.items as any[]) {
        const id = it.fontName;
        if (!id || boldById.has(id)) continue;
        const font = page.commonObjs.has(id) ? (page.commonObjs.get(id) as { name?: string }) : null;
        if (font?.name) boldById.set(id, BOLD_NAME_RE.test(font.name));
      }
    } catch {
      /* Names unavailable: parsers fall back to their width heuristic. */
    }
    const pageStart = items.length;
    for (const it of content.items as any[]) {
      if (typeof it.str !== 'string') continue;
      const x = it.transform?.[4] ?? 0;
      const y = it.transform?.[5] ?? 0;
      const height = Math.abs(it.transform?.[3] ?? it.height ?? 10);
      const width = it.width ?? 0;
      const t = it.transform ?? [1, 0, 0, 1, 0, 0];
      items.push({
        str: it.str,
        x,
        y,
        width,
        height,
        fontName: it.fontName ?? '',
        rotated: Math.abs(t[1]) > 0.01 || Math.abs(t[2]) > 0.01,
        ...(boldById.has(it.fontName) && { bold: boldById.get(it.fontName) }),
      });
    }
    markPlainOrdinals(items.slice(pageStart));
  }
  return items;
}

/** Marks an ordinal suffix the source printed at full size, not raised. */
export const PLAIN_ORDINAL = String.fromCharCode(0x200b);

/**
 * Students' PDFs print "1st" both ways: raised, as Word's AutoFormat sets it,
 * or plain when it was pasted or AutoFormat was off. The page raises every
 * ordinal by default, so an import would otherwise change the original's
 * plain ones (narrower line, taller row). A zero-width space between the
 * number and a full-size suffix (49, U+200B, th) keeps it plain; it is invisible
 * in the editor and on the page.
 */
export function markPlainOrdinals(items: TextItem[]): void {
  const ORD = /(\d)(st|nd|rd|th)\b/gi;
  items.forEach((it, i) => {
    it.str = it.str.replace(ORD, `$1${PLAIN_ORDINAL}$2`);
    // A suffix in its own run (a bold change, say) at the same size and on
    // the same baseline as the number before it is plain too. A raised one
    // sits ~3pt higher and is smaller.
    const prev = items[i - 1];
    if (
      prev &&
      /^(st|nd|rd|th)\b/i.test(it.str) &&
      /\d$/.test(prev.str) &&
      Math.abs(prev.y - it.y) < 0.5 &&
      Math.abs(prev.height - it.height) < 0.5 &&
      Math.abs(prev.x + prev.width - it.x) < 1
    ) {
      it.str = PLAIN_ORDINAL + it.str;
    }
  });
}

/** Group raw text items into visual lines by y coordinate (small tolerance). */
export function groupIntoLines(items: TextItem[]): PdfLine[] {
  if (!items.length) return [];

  const TOL = 4.5;
  const lines: PdfLine[] = [];
  const add = (ln: PdfLine, it: TextItem) => {
    ln.items.push(it);
    ln.startX = Math.min(ln.startX, it.x);
    ln.endX = Math.max(ln.endX, it.x + it.width);
    ln.height = Math.max(ln.height, it.height);
  };
  const open = (it: TextItem) =>
    lines.push({ y: it.y, startX: it.x, endX: it.x + it.width, height: it.height, items: [it], text: '' });

  // Body-size text seeds the lines, so each line's y is a real baseline.
  // Small raised items - superscript ordinals (8.25pt, 3.3pt up) and the
  // template's bullet glyph (3.4pt, 2.6pt up) - join afterwards, to the line
  // whose baseline lies just below them. Grouping them by nearest y put a
  // raised "nd" with the label line above when that label sat closer than its
  // own row, and the point lost it (or a label gained "st").
  const heights = items.filter((it) => it.str.trim()).map((it) => it.height).sort((a, b) => a - b);
  const body = heights.length ? heights[Math.floor(heights.length / 2)] : 10;
  const small = (it: TextItem) => it.height < body * 0.9 && !it.rotated;
  const sorted = [...items].filter((it) => it.str !== '').sort((a, b) => b.y - a.y);

  for (const it of sorted.filter((i) => !small(i))) {
    const existing = lines.find((l) => Math.abs(l.y - it.y) <= TOL);
    if (existing) add(existing, it);
    else open(it);
  }
  for (const it of sorted.filter(small)) {
    // PDF y runs up the page: the owning baseline is 1-5.5pt below the item.
    const below = lines
      .filter((l) => it.y - l.y >= 1 && it.y - l.y <= 5.5)
      .sort((a, b) => it.y - a.y - (it.y - b.y))[0];
    const near = below ?? lines.find((l) => Math.abs(l.y - it.y) <= TOL);
    if (near) add(near, it);
    else open(it);
  }

  for (const ln of lines) {
    ln.items.sort((a, b) => a.x - b.x);
    let prevEnd = -Infinity;
    let buf = '';
    for (const it of ln.items) {
      if (buf && it.x - prevEnd > 1.5 && !/\s$/.test(buf) && !/^\s/.test(it.str)) {
        buf += ' ';
      }
      buf += it.str;
      prevEnd = it.x + it.width;
    }
    ln.text = buf.replace(/\s+/g, ' ').trim();
  }

  return lines.filter((l) => l.text.length > 0).sort((a, b) => b.y - a.y);
}

export async function extractLines(file: File): Promise<PdfLine[] & WithRules> {
  const items = await extractTextItems(file);
  const lines: PdfLine[] & WithRules = groupIntoLines(items);
  lines.hRules = items.hRules;
  lines.railRules = items.railRules;
  return lines;
}

type Mat = [number, number, number, number, number, number];
const mul = (m: Mat, n: Mat): Mat => [
  n[0] * m[0] + n[1] * m[2],
  n[0] * m[1] + n[1] * m[3],
  n[2] * m[0] + n[3] * m[2],
  n[2] * m[1] + n[3] * m[3],
  n[4] * m[0] + n[5] * m[2] + m[4],
  n[4] * m[1] + n[5] * m[3] + m[5],
];

/** Horizontal rules (thin filled bars or straight strokes, at least 40pt
    long) that reach into the label column, x 20-95pt. */
export function horizontalRules(
  fnArray: number[],
  argsArray: unknown[],
  which: 'label' | 'rail' = 'label'
): number[] {
  const OPS = pdfjsLib.OPS;
  const out: number[] = [];
  let ctm: Mat = [1, 0, 0, 1, 0, 0];
  const stack: Mat[] = [];
  const pt = (x: number, y: number): [number, number] => [
    ctm[0] * x + ctm[2] * y + ctm[4],
    ctm[1] * x + ctm[3] * y + ctm[5],
  ];
  const add = (x1: number, x2: number, y: number) => {
    const lo = Math.min(x1, x2);
    const hi = Math.max(x1, x2);
    const hit = which === 'rail' ? lo < 20 && hi <= 36 && hi - lo >= 8 : hi - lo >= 40 && lo < 95 && hi > 20;
    if (hit) out.push(Math.round(y * 100) / 100);
  };
  fnArray.forEach((fn, i) => {
    const args = argsArray[i] as unknown[];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) ctm = mul(ctm, args as Mat);
    else if (fn === OPS.constructPath) {
      const sub = args[0] as number[];
      const c = args[1] as number[];
      let k = 0;
      let last: [number, number] | null = null;
      for (const op of sub) {
        if (op === OPS.rectangle) {
          const [a, b] = pt(c[k], c[k + 1]);
          const [e, f] = pt(c[k] + c[k + 2], c[k + 1] + c[k + 3]);
          if (Math.abs(f - b) <= 1.2) add(a, e, (b + f) / 2);
          k += 4;
        } else if (op === OPS.moveTo) {
          last = pt(c[k], c[k + 1]);
          k += 2;
        } else if (op === OPS.lineTo) {
          const p2 = pt(c[k], c[k + 1]);
          if (last && Math.abs(p2[1] - last[1]) < 0.2) add(last[0], p2[0], p2[1]);
          last = p2;
          k += 2;
        } else if (op === OPS.curveTo) k += 6;
        else if (op === OPS.curveTo2 || op === OPS.curveTo3) k += 4;
      }
    }
  });
  return out;
}

/** Backwards-compat plain-text extractor (no longer used by the parser). */
export async function extractPlainText(file: File): Promise<string> {
  const lines = await extractLines(file);
  return lines.map((l) => l.text).join('\n');
}
