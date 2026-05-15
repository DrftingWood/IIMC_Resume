import * as pdfjsLib from 'pdfjs-dist';

// Worker is copied to public/ by scripts/copy-pdf-worker.mjs
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface TextItem {
  str: string;
  x: number;
  y: number;
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
      // transform: [a, b, c, d, e, f] -> x = e, y = f
      const x = it.transform?.[4] ?? 0;
      const y = it.transform?.[5] ?? 0;
      items.push({ str: it.str, x, y });
    }
  }
  return items;
}

export async function extractPlainText(file: File): Promise<string> {
  const items = await extractTextItems(file);
  // Group by line (similar y), sort each line by x.
  if (!items.length) return '';
  const lines = new Map<number, TextItem[]>();
  for (const it of items) {
    const key = Math.round(it.y);
    let arr = lines.get(key);
    if (!arr) {
      arr = [];
      lines.set(key, arr);
    }
    arr.push(it);
  }
  const sortedKeys = [...lines.keys()].sort((a, b) => b - a);
  const out: string[] = [];
  for (const k of sortedKeys) {
    const row = lines.get(k)!;
    row.sort((a, b) => a.x - b.x);
    out.push(row.map((r) => r.str).join('  '));
  }
  return out.join('\n');
}
