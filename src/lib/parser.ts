import type {
  ResumeData,
  EducationRow,
  BulletGroup,
  ExperienceEntry,
  ExperienceSubSection,
  PositionEntry,
  YearedBullet,
} from '@/types/resume';

const ANCHORS = [
  'ACADEMIC QUALIFICATIONS',
  'ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS',
  'INDUSTRY EXPERIENCE',
  'POSITIONS OF RESPONSIBILITY',
  'EXTRA-CURRICULAR ACHIEVEMENTS',
];

function indexOfCI(hay: string, needle: string, from = 0): number {
  return hay.toLowerCase().indexOf(needle.toLowerCase(), from);
}

function splitSections(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const positions: { name: string; start: number }[] = [];
  for (const a of ANCHORS) {
    const idx = indexOfCI(text, a);
    if (idx >= 0) positions.push({ name: a, start: idx });
  }
  positions.sort((a, b) => a.start - b.start);

  result['HEADER'] = positions.length ? text.slice(0, positions[0].start) : text;
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start + positions[i].name.length;
    const end = i + 1 < positions.length ? positions[i + 1].start : text.length;
    result[positions[i].name] = text.slice(start, end);
  }
  return result;
}

function cleanLines(block: string): string[] {
  return block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function stripBullet(line: string): string {
  return line.replace(/^[•·●▪‣◦\-*]\s*/, '').trim();
}

function tailYear(line: string): { text: string; year: string } {
  // Common year patterns: 2024, '24, 24-25, 21-24, 18, 15
  const patterns = [
    /\s+((?:19|20)\d{2})\s*$/,
    /\s+(\d{2}\s*-\s*\d{2})\s*$/,
    /\s+(\d{2}\s*,\s*\d{2})\s*$/,
    /\s+(\d{2})\s*$/,
  ];
  for (const re of patterns) {
    const m = line.match(re);
    if (m) {
      return { text: line.slice(0, m.index).trim(), year: m[1].trim() };
    }
  }
  return { text: line.trim(), year: '' };
}

function parseHeader(block: string): Partial<ResumeData> {
  const lines = cleanLines(block);
  const mbaIdMatch = block.match(/MBA\/\d+\/\d+/);
  const mbaId = mbaIdMatch ? mbaIdMatch[0] : '';

  // Name: longest mostly-caps line that's not the institute.
  let name = '';
  for (const l of lines) {
    if (/INDIAN INSTITUTE OF MANAGEMENT/i.test(l)) continue;
    if (/भारतीय/.test(l)) continue;
    const letters = l.replace(/[^A-Za-z]/g, '');
    if (!letters) continue;
    const upper = l.replace(/[^A-Z]/g, '');
    if (upper.length / Math.max(letters.length, 1) > 0.8 && letters.length >= 6) {
      if (l.length > name.length) name = l.replace(/MBA\/\d+\/\d+/, '').trim();
    }
  }

  // Taglines: 3 short bold-cap lines near the bottom of header.
  const taglineCandidates = lines.filter((l) => {
    if (l === name) return false;
    if (/INDIAN INSTITUTE OF MANAGEMENT/i.test(l)) return false;
    if (/MBA\/\d+\/\d+/.test(l)) return false;
    if (/भारतीय/.test(l)) return false;
    const letters = l.replace(/[^A-Za-z]/g, '');
    if (letters.length < 5) return false;
    const upper = l.replace(/[^A-Z]/g, '');
    return upper.length / Math.max(letters.length, 1) > 0.6;
  });
  const taglines: [string, string, string] = ['', '', ''];
  // Try splitting last line into 3 by 3+ space separator.
  const lastCandidate = taglineCandidates[taglineCandidates.length - 1] ?? '';
  const parts = lastCandidate.split(/\s{3,}/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    taglines[0] = parts[0];
    taglines[1] = parts[1];
    taglines[2] = parts.slice(2).join(' ');
  } else if (taglineCandidates.length >= 3) {
    const tail = taglineCandidates.slice(-3);
    taglines[0] = tail[0];
    taglines[1] = tail[1];
    taglines[2] = tail[2];
  }

  return { name, mbaId, taglines };
}

function parseEducation(block: string): EducationRow[] {
  const lines = cleanLines(block).filter(
    (l) => !/degree\/exam/i.test(l) && !/board\/institute/i.test(l)
  );
  const rows: EducationRow[] = [];
  const knownDegrees = ['MBA', 'B.Tech', 'B.E', 'B.Sc', 'CLASS XII', 'CLASS X'];
  for (const l of lines) {
    if (rows.length >= 4) break;
    const degreeMatch = knownDegrees.find((d) =>
      new RegExp('^' + d.replace('.', '\\.'), 'i').test(l)
    );
    if (!degreeMatch) continue;
    // Year is rightmost token (4-digit or 2-digit).
    const yearMatch = l.match(/((?:19|20)\d{2}|\d{2})\s*$/);
    const year = yearMatch ? yearMatch[1] : '';
    const rest = yearMatch ? l.slice(0, yearMatch.index).trim() : l;
    // GPA: matches X.XX/X, XX.XX %, etc.
    const gpaMatch = rest.match(/([\d.]+\s*\/\s*\d+|[\d.]+\s*%)\s*$/);
    const gpa = gpaMatch ? gpaMatch[1].replace(/\s+/g, '') : '';
    const rest2 = gpaMatch ? rest.slice(0, gpaMatch.index).trim() : rest;
    // Degree vs institute split.
    let degree = degreeMatch;
    let institute = rest2.replace(new RegExp('^' + degreeMatch.replace('.', '\\.'), 'i'), '').trim();
    if (degreeMatch === 'CLASS XII' || degreeMatch === 'CLASS X') {
      degree = degreeMatch.toUpperCase();
    }
    rows.push({ degree, institute, gpa, year });
  }
  return rows;
}

function parseBulletGroups(block: string, knownCategories: string[]): BulletGroup[] {
  const lines = cleanLines(block);
  const groups: BulletGroup[] = [];
  let current: BulletGroup | null = null;
  for (const line of lines) {
    const cat = knownCategories.find((c) => line.toLowerCase().startsWith(c.toLowerCase()));
    if (cat && line.length < cat.length + 5) {
      current = { category: cat, bullets: [] };
      groups.push(current);
      continue;
    }
    const stripped = stripBullet(line);
    if (!stripped) continue;
    if (!current) {
      current = { category: 'Achievements', bullets: [] };
      groups.push(current);
    }
    const { text, year } = tailYear(stripped);
    const bullet: YearedBullet = { text, year };
    current.bullets.push(bullet);
  }
  return groups;
}

function parseIndustry(block: string): { entries: ExperienceEntry[]; rightText: string } {
  const lines = cleanLines(block);
  let rightText = '';
  const rtMatch = block.match(/(\d+\s*MONTHS\s*\([^)]+\))/i);
  if (rtMatch) rightText = rtMatch[1].toUpperCase();

  const entries: ExperienceEntry[] = [];
  const dateRe = /[A-Za-z]+[`'’]\d{2}\s*-\s*[A-Za-z]+[`'’]\d{2}/;

  const knownSubLabels = [
    'Awards and Recognition',
    'Cost Optimization',
    'Governance, Risk & Analytics',
    'Stakeholder Management',
    'BFSI CX Transformation',
  ];

  let current: ExperienceEntry | null = null;
  let currentSub: ExperienceSubSection | null = null;

  for (const line of lines) {
    if (/^industry experience/i.test(line)) continue;
    if (/full[- ]time/i.test(line) && line.length < 20) continue;
    if (/^intern$/i.test(line)) continue;

    const dm = line.match(dateRe);
    if (dm) {
      // firm header row
      const dates = dm[0];
      const before = line.slice(0, dm.index).trim();
      // Split firm/role: assume the two non-empty uppercase phrases.
      const parts = before.split(/\s{2,}/).filter(Boolean);
      const firm = parts[0] ?? '';
      const role = parts.slice(1).join(' ') || '';
      current = {
        type: entries.length === 0 ? 'Full Time' : 'Intern',
        firm,
        role,
        dates,
        subSections: [],
      };
      entries.push(current);
      currentSub = null;
      continue;
    }

    if (!current) continue;

    const subMatch = knownSubLabels.find(
      (s) => line.toLowerCase() === s.toLowerCase() || line.toLowerCase().startsWith(s.toLowerCase() + ' ')
    );
    if (subMatch) {
      currentSub = { label: subMatch, bullets: [] };
      current.subSections.push(currentSub);
      continue;
    }

    const stripped = stripBullet(line);
    if (!stripped) continue;
    if (!currentSub) {
      currentSub = { label: '', bullets: [] };
      current.subSections.push(currentSub);
    }
    currentSub.bullets.push(stripped);
  }

  return { entries, rightText };
}

function parsePositions(block: string): PositionEntry[] {
  const lines = cleanLines(block);
  const out: PositionEntry[] = [];
  let current: PositionEntry | null = null;
  for (const line of lines) {
    const yearMatch = line.match(/\s+((?:19|20)\d{2})\s*$/);
    const stripped = stripBullet(line);
    const looksLikeTitle = /,/.test(line) && !/^[•·●▪‣◦\-*]/.test(line) && line.length < 80 && !/[.%$₹]/.test(line);

    if (looksLikeTitle && !current) {
      current = { title: line, bullets: [], year: '' };
      out.push(current);
      continue;
    }

    if (!current) {
      current = { title: '', bullets: [], year: '' };
      out.push(current);
    }

    if (yearMatch && !current.year) {
      current.year = yearMatch[1];
      const text = stripBullet(line.slice(0, yearMatch.index).trim());
      if (text) current.bullets.push(text);
    } else {
      current.bullets.push(stripped);
    }
  }
  return out;
}

function parseFooter(block: string): { email: string; institute: string } {
  const emailMatch = block.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return {
    email: emailMatch ? emailMatch[0] : '',
    institute: 'Indian Institute of Management Calcutta',
  };
}

export function parseResume(text: string): Partial<ResumeData> {
  try {
    const sections = splitSections(text);

    const header = parseHeader(sections['HEADER'] ?? '');
    const education = parseEducation(sections['ACADEMIC QUALIFICATIONS'] ?? '');
    const distinctions = parseBulletGroups(
      sections['ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS'] ?? '',
      [
        'Competitive Examinations',
        'National Scholarships',
        'International Distinction & Mentorship',
        'National Case Competitions',
      ]
    );
    const { entries: experience, rightText: industryRightText } = parseIndustry(
      sections['INDUSTRY EXPERIENCE'] ?? ''
    );
    const positions = parsePositions(sections['POSITIONS OF RESPONSIBILITY'] ?? '');
    const extras = parseBulletGroups(
      sections['EXTRA-CURRICULAR ACHIEVEMENTS'] ?? '',
      ['International Debating', 'Strategy Competitions']
    );
    const footer = parseFooter(sections['EXTRA-CURRICULAR ACHIEVEMENTS'] ?? text);

    return {
      ...header,
      education,
      distinctions,
      experience,
      industryRightText,
      positions,
      extras,
      ...footer,
    };
  } catch (e) {
    console.warn('parseResume failed', e);
    return {};
  }
}
