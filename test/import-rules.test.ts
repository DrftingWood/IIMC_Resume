import { describe, it, expect } from 'vitest';
import * as pdfjsLib from 'pdfjs-dist';
import { groupIntoLines, horizontalRules, markPlainOrdinals } from '@/lib/pdfExtract';
import type { PdfLine, TextItem, WithRules } from '@/lib/pdfExtract';
import { parseResume as parseSkynet } from '@/templates/skynet/parser';

/* Synthetic pages at real Skynet coordinates (PDF y runs bottom-up). Two
   labels stacked in adjacent rows sit exactly one row apart - the same as two
   lines of one label - so only the ruled line between them separates them. */

function item(str: string, x: number, y: number, height = 9.9): TextItem {
  return { str, x, y, width: str.length * 4.6, height, fontName: 'F1', rotated: false };
}
const heading = (str: string, y: number) => item(str, 20, y, 11.2);
const row = (y: number, text: string, year: string, label?: string): TextItem[] => [
  ...(label ? [item(label, 30, y)] : []),
  item('■', 108.4, y + 2.6, 3.4),
  item(text, 113.2, y),
  item(year, 553, y),
];

function distinctions(rows: TextItem[][], hRules?: number[]) {
  const lines: PdfLine[] & WithRules = groupIntoLines([
    heading('ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS', 700),
    ...rows.flat(),
    heading('EXTRA-CURRICULAR ACHIEVEMENTS', 590),
  ]);
  lines.hRules = hRules;
  return parseSkynet(lines).data.distinctions!;
}

describe('label cells on import', () => {
  // "National / Distinctions" then "Olympiads / Scholastic", one row apart.
  const rows = [
    row(685, 'First point', '2021', 'National'),
    row(670.4, 'Second point', '2020', 'Distinctions'),
    row(655.8, 'Third point', '2019', 'Olympiads'),
    row(641.2, 'Fourth point', '2018', 'Scholastic'),
  ];

  it('splits two stacked labels at the ruled line between them', () => {
    const groups = distinctions(rows, [663.0]);
    expect(groups.map((g) => g.category)).toEqual(['National\nDistinctions', 'Olympiads\nScholastic']);
    expect(groups.map((g) => g.bullets.length)).toEqual([2, 2]);
  });

  it('keeps one label whole when no rule crosses it', () => {
    const groups = distinctions(rows.slice(0, 2), [692, 663.0]);
    expect(groups.map((g) => g.category)).toEqual(['National\nDistinctions']);
  });
});

describe('ruled lines from the operator list', () => {
  const OPS = pdfjsLib.OPS;
  it('finds thin filled bars and straight strokes that cross the label column', () => {
    const fn = [OPS.constructPath, OPS.constructPath, OPS.constructPath, OPS.constructPath];
    const args = [
      [[OPS.rectangle], [15.75, 777.25, 563.5, 0.75]], // frame rule: crosses
      [[OPS.moveTo, OPS.lineTo], [16.5, 637.38, 101.18, 637.38]], // label rule
      [[OPS.rectangle], [16.5, 600, 84, 14.6]], // grey cell: not a rule
      [[OPS.moveTo, OPS.lineTo], [16.5, 400, 30.77, 400]], // rail-only rule
    ];
    expect(horizontalRules(fn, args)).toEqual([777.63, 637.38]);
    expect(horizontalRules(fn, args, 'rail')).toEqual([400]);
  });

  it('applies the current transform', () => {
    const fn = [OPS.save, OPS.transform, OPS.constructPath, OPS.restore];
    const args = [[], [1, 0, 0, 1, 0, 100], [[OPS.moveTo, OPS.lineTo], [16.5, 500, 101, 500]], []];
    expect(horizontalRules(fn, args)).toEqual([600]);
  });
});

describe('raised superscripts on import', () => {
  it('stay with their own row even when a label line sits closer above', () => {
    // Label baseline 194.49, row baseline 187.18 (PDF y, bottom-up); the
    // raised "nd/" at 190.45 is 4.0pt from the label but 3.3pt above its row.
    const lines = groupIntoLines([
      item('Sports Podiums', 23, 194.49),
      item('Secured ', 113.2, 187.18),
      item('2', 147.8, 187.18),
      item('nd/', 152.8, 190.45, 8.25),
      item('30 teams', 165.2, 187.18),
    ]);
    const row = lines.find((l) => l.items.some((i) => i.str === 'Secured '))!;
    expect(row.items.map((i) => i.str)).toContain('nd/');
    expect(lines.find((l) => l.items.some((i) => i.str === 'Sports Podiums'))!.items).toHaveLength(1);
  });
});

describe('plain ordinals on import', () => {
  it('marks a full-size suffix so it is not raised, and leaves a raised one alone', () => {
    const plain = [item('Ranked 49th', 113.2, 600)];
    markPlainOrdinals(plain);
    expect(plain[0].str).toBe('Ranked 49' + String.fromCharCode(0x200b) + 'th');

    const split = [item('49', 113.2, 600), { ...item('th', 113.2 + 9.2, 600) }];
    markPlainOrdinals(split);
    expect(split[1].str.startsWith(String.fromCharCode(0x200b))).toBe(true);

    const raised = [item('49', 113.2, 600), item('th', 113.2 + 9.2, 603.3, 8.25)];
    markPlainOrdinals(raised);
    expect(raised[1].str).toBe('th');
  });
});
