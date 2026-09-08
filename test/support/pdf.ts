import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { groupIntoLines } from '@/lib/pdfExtract';
import type { PdfLine, TextItem } from '@/lib/pdfExtract';

/** Load a committed, anonymised fixture and regroup it into lines. */
export function loadFixture(name: string): PdfLine[] {
  const path = resolve(__dirname, '..', 'fixtures', `${name}.json`);
  const items = JSON.parse(readFileSync(path, 'utf8')) as TextItem[];
  return groupIntoLines(items);
}

/** Extract lines from a real PDF on disk. Only used by the opt-in corpus test. */
export async function linesFromPdf(path: string): Promise<PdfLine[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(readFileSync(path)),
    useSystemFonts: true,
  }).promise;
  const items: TextItem[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    for (const it of content.items as any[]) {
      if (typeof it.str !== 'string' || it.str === '') continue;
      const t = it.transform ?? [1, 0, 0, 1, 0, 0];
      items.push({
        str: it.str,
        x: it.transform?.[4] ?? 0,
        y: it.transform?.[5] ?? 0,
        height: Math.abs(it.transform?.[3] ?? it.height ?? 10),
        width: it.width ?? 0,
        fontName: it.fontName ?? '',
        rotated: Math.abs(t[1]) > 0.01 || Math.abs(t[2]) > 0.01,
      });
    }
  }
  return groupIntoLines(items);
}
