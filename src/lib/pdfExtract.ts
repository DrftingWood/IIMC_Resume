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

export interface PdfLine {
  y: number;
  startX: number;
  endX: number;
  height: number;
  items: TextItem[];
  text: string;
}

export async function extractTextItems(file: File): Promise<TextItem[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const items: TextItem[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // The text layer only carries internal font ids (g_d0_f3). Loading the
    // operator list resolves each id to its embedded font, whose real name
    // says whether it is bold - exact, unlike guessing from glyph widths
    // (bold Calibri is only ~5% wider, and digits skew that).
    const boldById = new Map<string, boolean>();
    try {
      await page.getOperatorList();
      for (const it of content.items as any[]) {
        const id = it.fontName;
        if (!id || boldById.has(id)) continue;
        const font = page.commonObjs.has(id) ? (page.commonObjs.get(id) as { name?: string }) : null;
        if (font?.name) boldById.set(id, BOLD_NAME_RE.test(font.name));
      }
    } catch {
      /* Names unavailable: parsers fall back to their width heuristic. */
    }
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
  }
  return items;
}

/** Group raw text items into visual lines by y coordinate (small tolerance). */
export function groupIntoLines(items: TextItem[]): PdfLine[] {
  if (!items.length) return [];

  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines: PdfLine[] = [];
  const TOL = 4.5;

  for (const it of sorted) {
    if (it.str === '') continue;
    const existing = lines.find((l) => Math.abs(l.y - it.y) <= TOL);
    if (existing) {
      existing.items.push(it);
      existing.startX = Math.min(existing.startX, it.x);
      existing.endX = Math.max(existing.endX, it.x + it.width);
      existing.height = Math.max(existing.height, it.height);
    } else {
      lines.push({
        y: it.y,
        startX: it.x,
        endX: it.x + it.width,
        height: it.height,
        items: [it],
        text: '',
      });
    }
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

export async function extractLines(file: File): Promise<PdfLine[]> {
  return groupIntoLines(await extractTextItems(file));
}

/** Backwards-compat plain-text extractor (no longer used by the parser). */
export async function extractPlainText(file: File): Promise<string> {
  const lines = await extractLines(file);
  return lines.map((l) => l.text).join('\n');
}
