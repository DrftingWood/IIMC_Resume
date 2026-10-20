import { describe, it, expect } from 'vitest';
import { groupIntoLines } from '@/lib/pdfExtract';
import type { TextItem } from '@/lib/pdfExtract';
import { parseResume as parseSkynet } from '@/templates/skynet/parser';

/* Synthetic page laid out at real Skynet coordinates: category label at
   x~40, bullet glyph at 108.4pt, point text from 113.2pt, year column at
   ~553pt. PDF y runs bottom-up, so later rows have smaller y. No real resume
   content, so it runs without the private fixtures. */

function item(str: string, x: number, y: number, height = 9.9): TextItem {
  return { str, x, y, width: str.length * 4.6, height, fontName: 'F1', rotated: false };
}

// Section headers are set at 11.2pt; the parser requires it.
const heading = (str: string, y: number) => item(str, 20, y, 11.2);

function row(y: number, words: [string, number][], year?: string): TextItem[] {
  // The 3.4pt bullet glyph sits 2.6pt above its text line, as in real PDFs.
  const out = [item('■', 108.4, y + 2.6, 3.4), ...words.map(([w, x]) => item(w, x, y))];
  if (year) out.push(item(year, 553, y));
  return out;
}

function page(rows: TextItem[][]): TextItem[] {
  return [
    heading('ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS', 700),
    item('Scholastic', 40, 670),
    ...rows.flat(),
    heading('EXTRA-CURRICULAR ACHIEVEMENTS', 600),
  ];
}

function distinctions(rows: TextItem[][]) {
  const data = parseSkynet(groupIntoLines(page(rows))).data;
  return data.distinctions!.flatMap((g) => g.bullets);
}

describe('year column on import', () => {
  it('keeps the whole point and every year when a number sits near the right edge', () => {
    // "23" at x=515 is right of the old threshold (~489pt). The old parser
    // took it as the year column's left edge, cut "IITs" off this point and
    // dropped the years of every row in the section.
    const bullets = distinctions([
      row(685, [['Qualified for admission in all', 113.2], ['23', 515], ['IITs', 527]], '2022'),
      row(670, [['Ranked first in the state olympiad', 113.2]], '2019'),
      row(655, [['Won the inter-school quiz', 113.2]], '2018'),
    ]);
    expect(bullets.map((b) => b.text)).toEqual([
      'Qualified for admission in all 23 IITs',
      'Ranked first in the state olympiad',
      'Won the inter-school quiz',
    ]);
    expect(bullets.map((b) => b.year)).toEqual(['2022', '2019', '2018']);
  });

  it('reads apostrophe and range year styles', () => {
    const bullets = distinctions([
      row(685, [['Led the debating society', 113.2]], "'19-'21"),
      row(670, [['Captained the cricket team', 113.2]], '2019–21'),
      row(655, [['Ran the school magazine', 113.2]], "'17"),
    ]);
    expect(bullets.map((b) => b.year)).toEqual(["'19-'21", '2019–21', "'17"]);
    expect(bullets.map((b) => b.text)).toEqual([
      'Led the debating society',
      'Captained the cricket team',
      'Ran the school magazine',
    ]);
  });
});
