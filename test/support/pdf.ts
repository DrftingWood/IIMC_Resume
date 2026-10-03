import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { groupIntoLines } from '@/lib/pdfExtract';
import type { PdfLine, TextItem } from '@/lib/pdfExtract';

/** Load a locally generated, anonymised fixture and regroup it into lines. */
export function loadFixture(name: string): PdfLine[] {
  const path = resolve(__dirname, '..', 'fixtures', `${name}.json`);
  const items = JSON.parse(readFileSync(path, 'utf8')) as TextItem[];
  return groupIntoLines(items);
}
