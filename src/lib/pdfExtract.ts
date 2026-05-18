import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
}

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
    for (const it of content.items as any[]) {
      if (typeof it.str !== 'string') continue;
      const x = it.transform?.[4] ?? 0;
      const y = it.transform?.[5] ?? 0;
      const height = Math.abs(it.transform?.[3] ?? it.height ?? 10);
      const width = it.width ?? 0;
      items.push({
        str: it.str,
        x,
        y,
        width,
        height,
        fontName: it.fontName ?? '',
      });
    }
  }
  return items;
}

/** Group items into visual lines by y coordinate (with small tolerance). */
export async function extractLines(file: File): Promise<PdfLine[]> {
  const items = await extractTextItems(file);
  if (!items.length) return [];

  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines: PdfLine[] = [];
  const TOL = 2.5;

  for (const it of sorted) {
    if (!it.str.trim() && it.str !== ' ') {
      // keep spaces (they matter for joining) but skip empty
      if (it.str === '') continue;
    }
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

  // Sort items left-to-right per line and build text
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

  // Filter out fully empty lines
  return lines.filter((l) => l.text.length > 0).sort((a, b) => b.y - a.y);
}

/** Backwards-compat plain-text extractor (no longer used by the parser). */
export async function extractPlainText(file: File): Promise<string> {
  const lines = await extractLines(file);
  return lines.map((l) => l.text).join('\n');
}
