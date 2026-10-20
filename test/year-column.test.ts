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

describe('year column precedence and unusual styles (red-team B)', () => {
  it('keeps a number at the end of the point when the year column has the year', () => {
    const bullets = distinctions([
      row(685, [['Top 1% in SNAP', 113.2], ["'24", 300]], '24-25'),
      row(670, [['Topped CBSE Class', 113.2], ['10', 280]], '2014'),
      row(655, [['Grew revenue in FY', 113.2], ['2019-20', 290]], '2021'),
    ]);
    expect(bullets.map((b) => b.text)).toEqual([
      "Top 1% in SNAP '24",
      'Topped CBSE Class 10',
      'Grew revenue in FY 2019-20',
    ]);
    expect(bullets.map((b) => b.year)).toEqual(['24-25', '2014', '2021']);
  });

  it('still reads the year from the end of the point when the column is empty', () => {
    const bullets = distinctions([row(685, [['Won the state quiz 2019', 113.2]])]);
    expect(bullets[0]).toEqual({ text: 'Won the state quiz', year: '2019' });
  });

  it('treats any year-shaped column text as the year, never as point text', () => {
    const styles = ["'17;'19", '22;24', '18|26', "21'-25'", "'22'23", '15/16', "‘17-’19"];
    const bullets = distinctions(
      styles.map((y, i) => row(685 - i * 11, [[`Point number ${i + 1}`, 113.2]], y))
    );
    expect(bullets.map((b) => b.text)).toEqual(styles.map((_, i) => `Point number ${i + 1}`));
    expect(bullets.map((b) => b.year)).toEqual(styles);
  });

  it('joins a year range that wraps onto the next row', () => {
    const bullets = distinctions([
      row(685, [['Led the fine arts society for two terms', 113.2]], '2020-'),
      [item('21', 553, 670)],
      row(655, [['Ran the school magazine', 113.2]], '2018'),
    ]);
    expect(bullets.map((b) => b.year)).toEqual(['2020-21', '2018']);
    expect(bullets[0].text).toBe('Led the fine arts society for two terms');
  });
});
