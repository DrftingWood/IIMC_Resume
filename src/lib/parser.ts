import type {
  ResumeData,
  EducationRow,
  BulletGroup,
  ExperienceEntry,
  ExperienceSubSection,
  PositionEntry,
  YearedBullet,
} from '@/types/resume';
import type { PdfLine, TextItem } from './pdfExtract';

const ANCHORS = [
  'ACADEMIC QUALIFICATIONS',
  'ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS',
  'INDUSTRY EXPERIENCE',
  'POSITIONS OF RESPONSIBILITY',
  'EXTRA-CURRICULAR ACHIEVEMENTS',
];

const BULLET_GLYPHS = '•·●▪‣◦∙⋅';
const BULLET_GLYPH_RE = new RegExp('^[' + BULLET_GLYPHS + ']');
const YEAR_TOKEN_RE = /^(?:(?:19|20)\d{2}|\d{2}\s*-\s*\d{2}|\d{2}\s*,\s*\d{2}|\d{2})$/;
const YEAR_TAIL_RE = /\s+((?:19|20)\d{2}|\d{2}\s*-\s*\d{2}|\d{2}\s*,\s*\d{2}|\d{2})\s*$/;
const DATE_RANGE_RE = /[A-Za-z]+\s*[`'’]\s*\d{2}\s*[-–]\s*[A-Za-z]+\s*[`'’]\s*\d{2}/;
const MBA_ID_RE = /MBA\/\d+\/\d+/;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/* ----------------------------- section split ----------------------------- */

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

function splitSections(lines: PdfLine[]): { header: PdfLine[]; sections: Section[] } {
  const anchors: { idx: number; name: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const a = findAnchorLine(lines[i]);
    if (a && !anchors.find((x) => x.name === a)) {
      anchors.push({ idx: i, name: a });
    }
  }
  if (!anchors.length) return { header: lines, sections: [] };
  const header = lines.slice(0, anchors[0].idx);
  const sections: Section[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i].idx + 1;
    const end = i + 1 < anchors.length ? anchors[i + 1].idx : lines.length;
    sections.push({ name: anchors[i].name, lines: lines.slice(start, end) });
  }
  return { header, sections };
}

/* ------------------------------- helpers --------------------------------- */

function joinItems(items: TextItem[]): string {
  if (!items.length) return '';
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let buf = '';
  let prevEnd = -Infinity;
  for (const it of sorted) {
    const gap = it.x - prevEnd;
    if (buf && gap > 1.2 && !/\s$/.test(buf) && !/^\s/.test(it.str)) buf += ' ';
    buf += it.str;
    prevEnd = it.x + it.width;
  }
  return buf.replace(/\s+/g, ' ').trim();
}

function stripBulletGlyph(text: string): string {
  return text.replace(new RegExp('^[' + BULLET_GLYPHS + ']+\\s*'), '').trim();
}

function startsWithBullet(items: TextItem[]): boolean {
  if (!items.length) return false;
  const first = items[0];
  return BULLET_GLYPH_RE.test(first.str.trim());
}

function splitYearTail(text: string): { text: string; year: string } {
  const m = text.match(YEAR_TAIL_RE);
  if (!m) return { text: text.trim(), year: '' };
  return { text: text.slice(0, m.index).trim(), year: m[1].trim() };
}

/** Locate the bullet column by taking the median x of every bullet glyph. */
function findBulletX(lines: PdfLine[]): number | null {
  const xs: number[] = [];
  for (const l of lines) {
    for (const it of l.items) {
      if (BULLET_GLYPH_RE.test(it.str.trim())) xs.push(it.x);
    }
  }
  if (!xs.length) return null;
  xs.sort((a, b) => a - b);
  return xs[Math.floor(xs.length / 2)];
}

/** The right-edge x threshold above which an item belongs to the year column. */
function findYearX(lines: PdfLine[]): number {
  const ends = lines.map((l) => l.endX).sort((a, b) => a - b);
  if (!ends.length) return Infinity;
  const p95 = ends[Math.floor(ends.length * 0.95)] ?? ends[ends.length - 1];
  return p95 - 28;
}

/** The typical y-distance between two consecutive lines of the same paragraph. */
function findLineHeight(lines: PdfLine[]): number {
  if (lines.length < 2) return 12;
  const deltas: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const d = lines[i - 1].y - lines[i].y;
    if (d > 2 && d < 40) deltas.push(d);
  }
  if (!deltas.length) return 12;
  deltas.sort((a, b) => a - b);
  return deltas[Math.floor(deltas.length / 2)];
}

interface RowParts {
  y: number;
  leftItems: TextItem[];
  midItems: TextItem[];
  rightItems: TextItem[];
  leftText: string;
  midText: string;
  rightText: string;
  hasBulletGlyph: boolean;
}

/**
 * Re-bin every item of every line into three column buckets:
 *   left   = sub-category cell (x < bulletX - tol)
 *   mid    = bullet text       (bulletX - tol <= x < yearX)
 *   right  = year              (x >= yearX)
 *
 * This is the key fix: when the sub-category label and the first bullet
 * share the same y in the PDF (which is how the original LaTeX renders
 * vertically-centered labels), the previous parser joined them into one
 * string and lost the label. We now split per-item by x.
 */
function classifyLines(lines: PdfLine[], bulletX: number, yearX: number): RowParts[] {
  const TOL = 6;
  return lines.map((l) => {
    const leftItems: TextItem[] = [];
    const midItems: TextItem[] = [];
    const rightItems: TextItem[] = [];
    for (const it of l.items) {
      const center = it.x + it.width / 2;
      if (center >= yearX) rightItems.push(it);
      else if (center >= bulletX - TOL) midItems.push(it);
      else leftItems.push(it);
    }
    return {
      y: l.y,
      leftItems,
      midItems,
      rightItems,
      leftText: joinItems(leftItems),
      midText: joinItems(midItems),
      rightText: joinItems(rightItems),
      hasBulletGlyph: startsWithBullet(midItems),
    };
  });
}

/* -------------------------------- header --------------------------------- */

function parseHeader(lines: PdfLine[]): {
  name: string;
  mbaId: string;
  taglines: [string, string, string];
} {
  const isInstituteLine = (t: string) =>
    /INDIAN INSTITUTE OF MANAGEMENT/i.test(t) || /भारतीय/.test(t);

  let mbaId = '';
  for (const l of lines) {
    const m = l.text.match(MBA_ID_RE);
    if (m) {
      mbaId = m[0];
      break;
    }
  }

  const nameCandidates = lines.filter(
    (l) => !isInstituteLine(l.text) && !MBA_ID_RE.test(l.text) && l.text.trim().length > 1
  );
  let name = '';
  if (nameCandidates.length) {
    const maxH = Math.max(...nameCandidates.map((l) => l.height));
    const tallest = nameCandidates.filter((l) => Math.abs(l.height - maxH) < 0.5);
    tallest.sort((a, b) => b.y - a.y || a.startX - b.startX);
    name = (tallest[0]?.text ?? '').replace(MBA_ID_RE, '').trim();
  }

  const isTaglineCandidate = (l: PdfLine) => {
    const t = l.text.trim();
    if (!t || t === name) return false;
    if (isInstituteLine(t) || MBA_ID_RE.test(t)) return false;
    const letters = t.replace(/[^A-Za-z]/g, '');
    if (letters.length < 3) return false;
    const upper = t.replace(/[^A-Z]/g, '');
    return upper.length / Math.max(letters.length, 1) > 0.6;
  };

  const taglineLines = lines.filter(isTaglineCandidate);
  let t1 = '',
    t2 = '',
    t3 = '';

  // First try: any tagline line that has three column-separated parts.
  for (const l of taglineLines) {
    const parts = l.text.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      t1 = parts[0];
      t2 = parts[1];
      t3 = parts.slice(2).join(' ');
      break;
    }
  }
  // Fallback: take the last three.
  if (!t1 && taglineLines.length >= 1) {
    const tail = taglineLines.slice(-3);
    t1 = tail[0]?.text ?? '';
    t2 = tail[1]?.text ?? '';
    t3 = tail[2]?.text ?? '';
  }

  return { name, mbaId, taglines: [t1, t2, t3] };
}

/* --------------------- generic column-aware bullet table ----------------- */

function parseBulletTable(lines: PdfLine[]): BulletGroup[] {
  if (!lines.length) return [];
  const bulletX = findBulletX(lines);
  if (bulletX == null) return [];
  const yearX = findYearX(lines);
  const lineHeight = findLineHeight(lines);
  const sameLabelGap = lineHeight * 1.9;

  const rows = classifyLines(lines, bulletX, yearX);

  const groups: BulletGroup[] = [];
  let current: BulletGroup | null = null;
  let lastBullet: YearedBullet | null = null;
  let prevLabelY: number | null = null;

  for (const r of rows) {
    /* -- LEFT column (sub-category label) -- */
    if (r.leftText) {
      const startsNew =
        !current ||
        prevLabelY == null ||
        prevLabelY - r.y > sameLabelGap;
      if (startsNew) {
        current = { category: r.leftText, bullets: [] };
        groups.push(current);
        lastBullet = null;
      } else if (current) {
        current.category = (current.category + '\n' + r.leftText).trim();
      }
      prevLabelY = r.y;
    }

    /* -- MID column (bullet text) -- */
    if (r.midText) {
      if (!current) {
        current = { category: '', bullets: [] };
        groups.push(current);
      }
      const yearFromRight = r.rightText && YEAR_TOKEN_RE.test(r.rightText.trim())
        ? r.rightText.trim()
        : '';

      if (r.hasBulletGlyph) {
        const stripped = stripBulletGlyph(r.midText);
        let { text, year } = splitYearTail(stripped);
        if (!year && yearFromRight) year = yearFromRight;
        lastBullet = { text, year };
        current.bullets.push(lastBullet);
      } else {
        // continuation of previous bullet (mid-column line with no glyph)
        const stripped = stripBulletGlyph(r.midText);
        if (lastBullet) {
          const { text: t, year: y } = splitYearTail(stripped);
          lastBullet.text = (lastBullet.text + ' ' + t).trim();
          if (y && !lastBullet.year) lastBullet.year = y;
          if (yearFromRight && !lastBullet.year) lastBullet.year = yearFromRight;
        } else if (stripped) {
          // No previous bullet — treat as a new (glyph-less) bullet.
          const { text, year } = splitYearTail(stripped);
          lastBullet = { text, year: year || yearFromRight };
          current.bullets.push(lastBullet);
        }
      }
    } else if (r.rightText && lastBullet) {
      // Year-only row (continuation of a wrapped bullet whose year sits below)
      const yr = r.rightText.trim();
      if (YEAR_TOKEN_RE.test(yr) && !lastBullet.year) lastBullet.year = yr;
    }
  }

  return groups.filter((g) => g.bullets.length > 0);
}

/* -------------------------------- positions ------------------------------ */

function parsePositions(lines: PdfLine[]): PositionEntry[] {
  if (!lines.length) return [];
  const bulletX = findBulletX(lines);
  if (bulletX == null) return [];
  const yearX = findYearX(lines);
  const lineHeight = findLineHeight(lines);
  const sameLabelGap = lineHeight * 1.9;

  const rows = classifyLines(lines, bulletX, yearX);

  const out: PositionEntry[] = [];
  let current: PositionEntry | null = null;
  let lastBulletIdx = -1;
  let prevLabelY: number | null = null;

  for (const r of rows) {
    if (r.leftText) {
      const startsNew =
        !current ||
        prevLabelY == null ||
        prevLabelY - r.y > sameLabelGap;
      if (startsNew) {
        current = { title: r.leftText, bullets: [], year: '' };
        out.push(current);
        lastBulletIdx = -1;
      } else if (current) {
        current.title = (current.title + '\n' + r.leftText).trim();
      }
      prevLabelY = r.y;
    }

    if (r.rightText && current) {
      const yr = r.rightText.trim();
      if (YEAR_TOKEN_RE.test(yr) && !current.year) current.year = yr;
    }

    if (r.midText) {
      if (!current) {
        current = { title: '', bullets: [], year: '' };
        out.push(current);
      }
      const stripped = stripBulletGlyph(r.midText);
      if (r.hasBulletGlyph || lastBulletIdx < 0) {
        current.bullets.push(stripped);
        lastBulletIdx = current.bullets.length - 1;
      } else {
        current.bullets[lastBulletIdx] =
          (current.bullets[lastBulletIdx] + ' ' + stripped).trim();
      }
    }
  }

  return out;
}

/* -------------------------------- industry ------------------------------- */

function parseIndustry(lines: PdfLine[]): {
  entries: ExperienceEntry[];
  rightText: string;
} {
  let rightText = '';
  for (const l of lines.slice(0, 4)) {
    const m = l.text.match(/(\d+\s*MONTHS\s*\([^)]+\))/i);
    if (m) {
      rightText = m[1].toUpperCase();
      break;
    }
  }

  // Filter out the rotated Intern / Full-Time labels (they show up as their
  // own short lines once unrolled by pdfjs).
  const bodyLines = lines.filter((l) => {
    const t = l.text.trim();
    if (/^full[- ]?time$/i.test(t)) return false;
    if (/^intern$/i.test(t)) return false;
    return true;
  });

  const bulletX = findBulletX(bodyLines);
  const yearX = findYearX(bodyLines); // industry has no year col but harmless
  const lineHeight = findLineHeight(bodyLines);
  const sameLabelGap = lineHeight * 1.9;

  if (bulletX == null) {
    return { entries: [], rightText };
  }

  const rows = classifyLines(bodyLines, bulletX, yearX);

  const entries: ExperienceEntry[] = [];
  let entry: ExperienceEntry | null = null;
  let sub: ExperienceSubSection | null = null;
  let lastBulletIdx = -1;
  let prevLabelY: number | null = null;

  for (const r of rows) {
    const fullText = [r.leftText, r.midText, r.rightText].filter(Boolean).join(' ');

    // Firm banner row: contains a date range like "Mon`XX - Mon`YY".
    const dm = fullText.match(DATE_RANGE_RE);
    if (dm) {
      const dates = dm[0];
      const before = fullText.slice(0, dm.index).trim();
      // Split firm vs role by the largest x-gap between consecutive items.
      const all = [...r.leftItems, ...r.midItems, ...r.rightItems].sort(
        (a, b) => a.x - b.x
      );
      const beforeItems = all.filter((it) => !DATE_RANGE_RE.test(it.str));
      let firm = '';
      let role = '';
      let maxGap = -1;
      let splitAt = -1;
      for (let i = 1; i < beforeItems.length; i++) {
        const gap = beforeItems[i].x - (beforeItems[i - 1].x + beforeItems[i - 1].width);
        if (gap > maxGap) {
          maxGap = gap;
          splitAt = i;
        }
      }
      if (splitAt > 0 && maxGap > 10) {
        firm = joinItems(beforeItems.slice(0, splitAt));
        role = joinItems(beforeItems.slice(splitAt));
      } else {
        firm = before;
      }

      entry = {
        type: entries.length === 0 ? 'Full Time' : 'Intern',
        firm,
        role,
        dates,
        subSections: [],
      };
      entries.push(entry);
      sub = null;
      lastBulletIdx = -1;
      prevLabelY = null;
      continue;
    }

    if (!entry) continue;

    if (r.leftText) {
      const startsNew =
        !sub ||
        prevLabelY == null ||
        prevLabelY - r.y > sameLabelGap;
      if (startsNew) {
        sub = { label: r.leftText, bullets: [] };
        entry.subSections.push(sub);
        lastBulletIdx = -1;
      } else if (sub) {
        sub.label = (sub.label + '\n' + r.leftText).trim();
      }
      prevLabelY = r.y;
    }

    if (r.midText) {
      if (!sub) {
        sub = { label: '', bullets: [] };
        entry.subSections.push(sub);
      }
      const stripped = stripBulletGlyph(r.midText);
      if (r.hasBulletGlyph || lastBulletIdx < 0) {
        sub.bullets.push(stripped);
        lastBulletIdx = sub.bullets.length - 1;
      } else {
        sub.bullets[lastBulletIdx] =
          (sub.bullets[lastBulletIdx] + ' ' + stripped).trim();
      }
    }
  }

  return { entries, rightText };
}

/* ------------------------------- education ------------------------------- */

function parseEducation(lines: PdfLine[]): EducationRow[] {
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
  if (!filtered.length) return [];

  // Cluster all item x positions into 4 columns.
  const items = filtered.flatMap((l) => l.items);
  const xs = items.map((it) => it.x).sort((a, b) => a - b);
  const xMin = xs[0];
  const xMax = xs[xs.length - 1];
  const seeds = [
    xMin + (xMax - xMin) * 0.05,
    xMin + (xMax - xMin) * 0.4,
    xMin + (xMax - xMin) * 0.75,
    xMin + (xMax - xMin) * 0.92,
  ];
  const bounds = [
    (seeds[0] + seeds[1]) / 2,
    (seeds[1] + seeds[2]) / 2,
    (seeds[2] + seeds[3]) / 2,
  ];

  const rows: EducationRow[] = [];
  for (const line of filtered) {
    const cols: TextItem[][] = [[], [], [], []];
    for (const it of line.items) {
      const c = it.x + it.width / 2;
      let idx = 0;
      if (c >= bounds[0]) idx = 1;
      if (c >= bounds[1]) idx = 2;
      if (c >= bounds[2]) idx = 3;
      cols[idx].push(it);
    }
    const cells = cols.map(joinItems);
    const [degree, institute, gpa, year] = cells;
    if (!degree && !institute && !gpa && !year) continue;
    if (/degree/i.test(degree) && /board|institute/i.test(institute)) continue;
    rows.push({ degree, institute, gpa, year });
  }
  return rows.slice(0, 8);
}

/* -------------------------------- footer --------------------------------- */

function parseFooter(allLines: PdfLine[]): { email: string; institute: string } {
  let email = '';
  for (const l of allLines) {
    const m = l.text.match(EMAIL_RE);
    if (m) email = m[0];
  }
  return { email, institute: 'Indian Institute of Management Calcutta' };
}

/* ----------------------------- entry point ------------------------------- */

export function parseResume(lines: PdfLine[]): Partial<ResumeData> {
  try {
    const { header, sections } = splitSections(lines);
    const headerInfo = parseHeader(header);
    const footer = parseFooter(lines);
    const getSection = (name: string) =>
      sections.find((s) => s.name === name)?.lines ?? [];

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

/** Kept for backwards compat; the new pipeline calls parseResume(PdfLine[]). */
export function parseResumeText(_text: string): Partial<ResumeData> {
  return {};
}
