import type {
  ResumeData,
  EducationRow,
  BulletGroup,
  ExperienceEntry,
  ExperienceSubSection,
  PositionEntry,
  YearedBullet,
} from '@/types/resume';
import type { PdfLine } from './pdfExtract';

const ANCHORS = [
  'ACADEMIC QUALIFICATIONS',
  'ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS',
  'INDUSTRY EXPERIENCE',
  'POSITIONS OF RESPONSIBILITY',
  'EXTRA-CURRICULAR ACHIEVEMENTS',
];

const BULLET_GLYPH_RE = /^[•·●▪‣◦∙⋅•‣◦]/;
const YEAR_RE = /^(?:(?:19|20)\d{2}|\d{2}\s*-\s*\d{2}|\d{2})$/;
const YEAR_TAIL_RE = /\s+((?:19|20)\d{2}|\d{2}\s*-\s*\d{2}|\d{2}\s*,\s*\d{2}|\d{2})\s*$/;
const DATE_RANGE_RE = /[A-Za-z]+\s*[`'’]\s*\d{2}\s*[-–]\s*[A-Za-z]+\s*[`'’]\s*\d{2}/;
const MBA_ID_RE = /MBA\/\d+\/\d+/;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

interface Section {
  name: string;
  lines: PdfLine[];
}

function findAnchorLine(line: PdfLine): string | null {
  const t = line.text.toUpperCase().replace(/\s+/g, ' ').trim();
  for (const a of ANCHORS) {
    if (t === a || t.startsWith(a)) return a;
  }
  return null;
}

function splitSections(lines: PdfLine[]): { header: PdfLine[]; sections: Section[]; footer: PdfLine[] } {
  const anchors: { idx: number; name: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const a = findAnchorLine(lines[i]);
    if (a && !anchors.find((x) => x.name === a)) {
      anchors.push({ idx: i, name: a });
    }
  }
  if (!anchors.length) {
    return { header: lines, sections: [], footer: [] };
  }
  const header = lines.slice(0, anchors[0].idx);
  const sections: Section[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i].idx + 1;
    const end = i + 1 < anchors.length ? anchors[i + 1].idx : lines.length;
    sections.push({ name: anchors[i].name, lines: lines.slice(start, end) });
  }
  // Footer: trailing email/institute lines after the last section's last bullet.
  // We keep them inside the last section block; the email regex still works on the whole document.
  return { header, sections, footer: [] };
}

function maxFontHeight(lines: PdfLine[]): number {
  return lines.reduce((m, l) => Math.max(m, l.height), 0);
}

function parseHeader(lines: PdfLine[]): {
  name: string;
  mbaId: string;
  taglines: [string, string, string];
} {
  let mbaId = '';
  for (const l of lines) {
    const m = l.text.match(MBA_ID_RE);
    if (m) {
      mbaId = m[0];
      break;
    }
  }

  // Name = the line with the largest font height that isn't the institute,
  // isn't an MBA id and isn't Hindi.
  const isInstituteLine = (t: string) =>
    /INDIAN INSTITUTE OF MANAGEMENT/i.test(t) || /भारतीय/.test(t);

  const nameCandidates = lines.filter(
    (l) => !isInstituteLine(l.text) && !MBA_ID_RE.test(l.text) && l.text.trim().length > 1
  );

  let name = '';
  if (nameCandidates.length) {
    const maxH = Math.max(...nameCandidates.map((l) => l.height));
    const tallest = nameCandidates.filter((l) => Math.abs(l.height - maxH) < 0.5);
    // Prefer the leftmost (top-left) tallest line.
    tallest.sort((a, b) => b.y - a.y || a.startX - b.startX);
    name = tallest[0]?.text.trim() ?? '';
    // The name and the MBA ID are on the same y but the MBA ID was a separate item.
    name = name.replace(MBA_ID_RE, '').trim();
  }

  // Taglines: the last 1-3 visual lines that are bold uppercase and not the name/institute.
  // The tagline row is rendered as a flex row with 3 cells separated by gaps —
  // pdfjs may see them as either one line (joined) or three lines.
  const isTaglineCandidate = (l: PdfLine) => {
    const t = l.text.trim();
    if (!t) return false;
    if (t === name) return false;
    if (isInstituteLine(t)) return false;
    if (MBA_ID_RE.test(t)) return false;
    const letters = t.replace(/[^A-Za-z]/g, '');
    if (letters.length < 3) return false;
    const upper = t.replace(/[^A-Z]/g, '');
    return upper.length / Math.max(letters.length, 1) > 0.6;
  };

  const taglineLines = lines.filter(isTaglineCandidate);
  let t1 = '',
    t2 = '',
    t3 = '';
  if (taglineLines.length === 1) {
    const parts = taglineLines[0].text.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      [t1, t2] = [parts[0], parts[1]];
      t3 = parts.slice(2).join(' ');
    } else {
      t1 = taglineLines[0].text;
    }
  } else if (taglineLines.length >= 2) {
    // Try to find a line with three column-separated items first.
    for (const l of taglineLines) {
      const parts = l.text.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 3) {
        t1 = parts[0];
        t2 = parts[1];
        t3 = parts.slice(2).join(' ');
        break;
      }
    }
    if (!t1) {
      const tail = taglineLines.slice(-3);
      t1 = tail[0]?.text ?? '';
      t2 = tail[1]?.text ?? '';
      t3 = tail[2]?.text ?? '';
    }
  }

  return { name, mbaId, taglines: [t1, t2, t3] };
}

/**
 * Find the x-coordinate that separates the sub-category column from the
 * bullet column. Uses bullet-glyph item positions as the anchor: every •
 * sits at the start of the bullet column.
 */
function bulletColumnX(lines: PdfLine[]): number | null {
  const xs: number[] = [];
  for (const l of lines) {
    for (const it of l.items) {
      if (BULLET_GLYPH_RE.test(it.str.trim())) {
        xs.push(it.x);
      }
    }
  }
  if (!xs.length) return null;
  xs.sort((a, b) => a - b);
  return xs[Math.floor(xs.length / 2)]; // median
}

/** Treat a line as "starts in bullet column" if its leftmost item x is within
 *  tolerance of the bullet column x. */
function startsInBulletColumn(line: PdfLine, bulletX: number): boolean {
  return Math.abs(line.startX - bulletX) <= 8 || line.startX >= bulletX - 3;
}

function hasBulletGlyph(line: PdfLine): boolean {
  const first = line.items[0];
  if (!first) return false;
  return BULLET_GLYPH_RE.test(first.str.trim()) || BULLET_GLYPH_RE.test(line.text);
}

function stripBulletGlyph(text: string): string {
  return text.replace(/^[•·●▪‣◦∙⋅•‣◦]\s*/, '').trim();
}

/** Splits trailing year from a bullet text. */
function splitYearTail(text: string): { text: string; year: string } {
  const m = text.match(YEAR_TAIL_RE);
  if (!m) return { text: text.trim(), year: '' };
  return { text: text.slice(0, m.index).trim(), year: m[1].trim() };
}

/** Decide if a year item is rendered in the right-most "year" column. */
function isRightYearItem(line: PdfLine, rightEdge: number): { year: string; restText: string } | null {
  if (!line.items.length) return null;
  const last = line.items[line.items.length - 1];
  if (last.x < rightEdge) return null;
  if (!YEAR_RE.test(last.str.trim())) return null;
  // Build "rest" by removing the last item's contribution.
  const restItems = line.items.slice(0, -1);
  const text = restItems.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
  return { year: last.str.trim(), restText: stripBulletGlyph(text) };
}

/** Compute right-edge x threshold for the year column. */
function rightEdgeThreshold(lines: PdfLine[]): number {
  // Look at every line's max x; the year column is the rightmost ~5%.
  // We pick the 95th percentile right edge minus a small margin.
  const ends = lines.map((l) => l.endX).sort((a, b) => a - b);
  if (!ends.length) return Infinity;
  const p95 = ends[Math.floor(ends.length * 0.95)] ?? ends[ends.length - 1];
  return p95 - 30; // anything within 30pt of right edge counts
}

/**
 * Generic 3-column bullet table parser:
 *   col 1 = sub-category label
 *   col 2 = bullet text
 *   col 3 = year
 * A sub-category is detected as: a line that starts well to the LEFT of
 * the bullet column and does not itself contain a bullet glyph.
 */
function parseBulletTable(lines: PdfLine[]): BulletGroup[] {
  if (!lines.length) return [];
  const bulletX = bulletColumnX(lines);
  const rightEdge = rightEdgeThreshold(lines);

  const groups: BulletGroup[] = [];
  let current: BulletGroup | null = null;
  let lastBullet: YearedBullet | null = null;

  // A line is a sub-category label if it starts well to the left of bulletX
  const isSubCategoryLine = (l: PdfLine) => {
    if (bulletX == null) return false;
    return l.startX < bulletX - 15 && !hasBulletGlyph(l);
  };

  // Pre-pass: merge consecutive sub-category lines (multi-line label) into one
  // sub-category that owns the following bullets.
  let pendingLabelParts: string[] = [];

  const flushLabel = () => {
    if (pendingLabelParts.length) {
      current = { category: pendingLabelParts.join('\n'), bullets: [] };
      groups.push(current);
      pendingLabelParts = [];
      lastBullet = null;
    }
  };

  for (const l of lines) {
    const text = l.text.trim();
    if (!text) continue;

    if (isSubCategoryLine(l)) {
      // This is a label line. If we were continuing a bullet, it's done now.
      lastBullet = null;
      pendingLabelParts.push(text);
      continue;
    }

    // We are about to consume a bullet/continuation row — flush any pending label.
    flushLabel();

    if (!current) {
      current = { category: '', bullets: [] };
      groups.push(current);
    }

    const yc = isRightYearItem(l, rightEdge);
    if (hasBulletGlyph(l)) {
      // New bullet
      let bulletText = '';
      let year = '';
      if (yc) {
        bulletText = yc.restText;
        year = yc.year;
      } else {
        const { text: t, year: y } = splitYearTail(stripBulletGlyph(text));
        bulletText = t;
        year = y;
      }
      lastBullet = { text: bulletText, year };
      current.bullets.push(lastBullet);
    } else {
      // Continuation of the previous bullet (or no bullet glyph at all).
      const stripped = stripBulletGlyph(text);
      if (!stripped) continue;
      if (lastBullet) {
        // Append, but watch out for year that may have wrapped to its own line.
        if (yc && !lastBullet.year) {
          lastBullet.year = yc.year;
          if (yc.restText) {
            lastBullet.text = (lastBullet.text + ' ' + yc.restText).trim();
          }
        } else {
          const { text: t, year: y } = splitYearTail(stripped);
          lastBullet.text = (lastBullet.text + ' ' + t).trim();
          if (y && !lastBullet.year) lastBullet.year = y;
        }
      } else {
        // No prior bullet — treat as a new bullet without a glyph.
        const { text: t, year: y } = splitYearTail(stripped);
        lastBullet = { text: t, year: y };
        current.bullets.push(lastBullet);
      }
    }
  }

  // If we ended with an unflushed label and no bullets, drop it.
  if (pendingLabelParts.length && (!current || !current.bullets.length)) {
    // No bullets followed a trailing label — discard.
    if (current && !current.bullets.length) {
      groups.pop();
    }
  }

  // Drop empty groups.
  return groups.filter((g) => g.bullets.length > 0);
}

function parseEducation(lines: PdfLine[]): EducationRow[] {
  // Filter the column header row.
  const filtered = lines.filter((l) => {
    const t = l.text.toLowerCase();
    return (
      !/^degree\/exam/.test(t) &&
      !/^board\/institute/.test(t) &&
      !/^%\/cgpa/.test(t) &&
      !/^year$/.test(t) &&
      !/degree.*board.*cgpa/.test(t)
    );
  });

  // Try column-based extraction first. The education table has 4 columns;
  // detect their x boundaries by clustering item x positions.
  const items = filtered.flatMap((l) => l.items);
  if (!items.length) return [];

  const xs = items.map((it) => it.x).sort((a, b) => a - b);
  // Cluster into 4 columns: simple approach — take quartile midpoints.
  // Use kmeans-lite: 4 seeds at 1/8, 3/8, 5/8, 7/8 of x range.
  const xMin = xs[0];
  const xMax = xs[xs.length - 1];
  const seeds = [
    xMin + (xMax - xMin) * 0.05,
    xMin + (xMax - xMin) * 0.4,
    xMin + (xMax - xMin) * 0.75,
    xMin + (xMax - xMin) * 0.92,
  ];
  // Boundaries midway between seeds.
  const bounds = [
    (seeds[0] + seeds[1]) / 2,
    (seeds[1] + seeds[2]) / 2,
    (seeds[2] + seeds[3]) / 2,
  ];

  const rows: EducationRow[] = [];
  for (const line of filtered) {
    const cols: string[][] = [[], [], [], []];
    for (const it of line.items) {
      let idx = 0;
      if (it.x >= bounds[0]) idx = 1;
      if (it.x >= bounds[1]) idx = 2;
      if (it.x >= bounds[2]) idx = 3;
      cols[idx].push(it.str);
    }
    const cells = cols.map((c) => c.join(' ').replace(/\s+/g, ' ').trim());
    const [degree, institute, gpa, year] = cells;
    if (!degree && !institute && !gpa && !year) continue;
    // Skip the header row if it slipped through.
    if (/degree/i.test(degree) && /board|institute/i.test(institute)) continue;
    rows.push({
      degree: degree || '',
      institute: institute || '',
      gpa: gpa || '',
      year: year || '',
    });
  }
  return rows.slice(0, 8);
}

function parseIndustry(lines: PdfLine[]): { entries: ExperienceEntry[]; rightText: string } {
  let rightText = '';
  // The rightText was rendered on the section banner; the section header line
  // itself was consumed during splitSections, but its right-aligned text
  // ("XX MONTHS (FULL-TIME)") could remain on the first line of the section.
  for (const l of lines.slice(0, 3)) {
    const m = l.text.match(/(\d+\s*MONTHS\s*\([^)]+\))/i);
    if (m) {
      rightText = m[1].toUpperCase();
      break;
    }
  }

  // Drop the "Intern" / "Full Time" rotated labels (those land in their own
  // very-narrow column and pdfjs reads them as separate single-line items).
  const bodyLines = lines.filter((l) => {
    const t = l.text.trim();
    if (/^full[- ]?time$/i.test(t)) return false;
    if (/^intern$/i.test(t)) return false;
    return true;
  });

  const bulletX = bulletColumnX(bodyLines);
  const entries: ExperienceEntry[] = [];
  let currentEntry: ExperienceEntry | null = null;
  let currentSub: ExperienceSubSection | null = null;
  let lastBullet: { ref: string[] } | null = null;

  const isSubCategoryLine = (l: PdfLine) => {
    if (bulletX == null) return false;
    return l.startX < bulletX - 15 && !hasBulletGlyph(l);
  };

  let pendingLabelParts: string[] = [];
  const flushLabel = () => {
    if (pendingLabelParts.length && currentEntry) {
      currentSub = { label: pendingLabelParts.join('\n'), bullets: [] };
      currentEntry.subSections.push(currentSub);
      pendingLabelParts = [];
      lastBullet = null;
    }
  };

  for (const l of bodyLines) {
    const text = l.text.trim();
    if (!text) continue;

    const dm = text.match(DATE_RANGE_RE);
    if (dm) {
      // Firm banner row: "ORG  ROLE  Mon`XX - Mon`YY"
      const before = text.slice(0, dm.index).trim();
      const dates = dm[0];
      // Split firm/role using the items: organisation is the leftmost
      // grouping, role is the middle, dates are on the right.
      let firm = '';
      let role = '';
      if (before) {
        // Find the largest internal x-gap in the items to split firm/role.
        const items = l.items.filter(
          (it) => !DATE_RANGE_RE.test(it.str) && it.x < (l.items[l.items.length - 1].x - 5)
        );
        let maxGap = 0;
        let splitAt = -1;
        for (let i = 1; i < items.length; i++) {
          const gap = items[i].x - (items[i - 1].x + items[i - 1].width);
          if (gap > maxGap) {
            maxGap = gap;
            splitAt = i;
          }
        }
        if (splitAt > 0 && maxGap > 8) {
          firm = items.slice(0, splitAt).map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
          role = items.slice(splitAt).map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
        } else {
          firm = before;
        }
      }

      currentEntry = {
        type: entries.length === 0 ? 'Full Time' : 'Intern',
        firm,
        role,
        dates,
        subSections: [],
      };
      entries.push(currentEntry);
      currentSub = null;
      lastBullet = null;
      pendingLabelParts = [];
      continue;
    }

    if (!currentEntry) continue;

    if (isSubCategoryLine(l)) {
      lastBullet = null;
      pendingLabelParts.push(text);
      continue;
    }

    flushLabel();

    if (!currentSub) {
      currentSub = { label: '', bullets: [] };
      currentEntry.subSections.push(currentSub);
    }

    if (hasBulletGlyph(l)) {
      const stripped = stripBulletGlyph(text);
      currentSub.bullets.push(stripped);
      lastBullet = { ref: currentSub.bullets };
    } else {
      // Continuation of the previous bullet.
      const stripped = stripBulletGlyph(text);
      if (!stripped) continue;
      if (lastBullet && lastBullet.ref.length) {
        const idx = lastBullet.ref.length - 1;
        lastBullet.ref[idx] = (lastBullet.ref[idx] + ' ' + stripped).trim();
      } else {
        currentSub.bullets.push(stripped);
        lastBullet = { ref: currentSub.bullets };
      }
    }
  }

  return { entries, rightText };
}

function parsePositions(lines: PdfLine[]): PositionEntry[] {
  if (!lines.length) return [];
  const bulletX = bulletColumnX(lines);
  const rightEdge = rightEdgeThreshold(lines);

  const isLabelLine = (l: PdfLine) => {
    if (bulletX == null) return false;
    return l.startX < bulletX - 15 && !hasBulletGlyph(l);
  };

  const positions: PositionEntry[] = [];
  let current: PositionEntry | null = null;
  let pendingLabelParts: string[] = [];
  let lastBulletRef: { arr: string[]; idx: number } | null = null;

  const flushLabel = () => {
    if (pendingLabelParts.length) {
      current = { title: pendingLabelParts.join('\n'), bullets: [], year: '' };
      positions.push(current);
      pendingLabelParts = [];
      lastBulletRef = null;
    }
  };

  for (const l of lines) {
    const text = l.text.trim();
    if (!text) continue;

    if (isLabelLine(l)) {
      lastBulletRef = null;
      pendingLabelParts.push(text);
      continue;
    }

    flushLabel();
    if (!current) {
      current = { title: '', bullets: [], year: '' };
      positions.push(current);
    }

    const yc = isRightYearItem(l, rightEdge);
    if (yc && !current.year) current.year = yc.year;

    const stripped = stripBulletGlyph(yc ? yc.restText : text);
    if (!stripped) continue;

    if (hasBulletGlyph(l) || !lastBulletRef) {
      current.bullets.push(stripped);
      lastBulletRef = { arr: current.bullets, idx: current.bullets.length - 1 };
    } else {
      lastBulletRef.arr[lastBulletRef.idx] = (lastBulletRef.arr[lastBulletRef.idx] + ' ' + stripped).trim();
    }
  }

  return positions;
}

function parseFooter(allLines: PdfLine[]): { email: string; institute: string } {
  let email = '';
  for (const l of allLines) {
    const m = l.text.match(EMAIL_RE);
    if (m) email = m[0]; // last match wins
  }
  return { email, institute: 'Indian Institute of Management Calcutta' };
}

export function parseResume(lines: PdfLine[]): Partial<ResumeData> {
  try {
    const { header, sections } = splitSections(lines);
    const headerInfo = parseHeader(header);
    const footer = parseFooter(lines);

    const getSection = (name: string) => sections.find((s) => s.name === name)?.lines ?? [];

    const education = parseEducation(getSection('ACADEMIC QUALIFICATIONS'));
    const distinctions = parseBulletTable(
      getSection('ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS')
    );
    const { entries: experience, rightText: industryRightText } = parseIndustry(
      getSection('INDUSTRY EXPERIENCE')
    );
    const positions = parsePositions(getSection('POSITIONS OF RESPONSIBILITY'));
    const extras = parseBulletTable(getSection('EXTRA-CURRICULAR ACHIEVEMENTS'));

    return {
      name: headerInfo.name,
      mbaId: headerInfo.mbaId,
      taglines: headerInfo.taglines,
      education,
      distinctions,
      experience,
      industryRightText,
      positions,
      extras,
      email: footer.email,
      institute: footer.institute,
    };
  } catch (e) {
    console.warn('parseResume failed', e);
    return {};
  }
}

/** Legacy string-based entry point kept so the build doesn't break if anyone
 *  imports it. The new pipeline calls parseResume(PdfLine[]) directly. */
export function parseResumeText(_text: string): Partial<ResumeData> {
  return {};
}
