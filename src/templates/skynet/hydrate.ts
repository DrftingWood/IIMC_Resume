import type { SkynetResumeData, SectionKey, CustomSection } from './types';
import { emptySkynetResume, DEFAULT_SECTION_ORDER } from './types';
import { isCustomKey } from '@/lib/customSections';
import { sanitizeHidden } from '@/lib/visibility';
import { isDensity } from '@/lib/density';

export function hydrateSkynet(input: Partial<SkynetResumeData>): SkynetResumeData {
  const base = emptySkynetResume();
  const merged: SkynetResumeData = { ...base, ...input } as SkynetResumeData;

  if (!Array.isArray(merged.taglines) || merged.taglines.length !== 3) {
    merged.taglines = ['', '', ''];
  }
  for (const key of ['distinctions', 'projects', 'entrepreneurial', 'extras',
                     'education', 'experience', 'positions'] as const) {
    if (!Array.isArray(merged[key])) (merged as never as Record<string, unknown>)[key] = [];
  }

  // Every field the page draws must be a string, or a hand-edited or
  // corrupted draft (a null type, a number for a point) crashes the preview
  // and the export alike.
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const strs = (v: unknown) => (Array.isArray(v) ? v.map(str) : []);
  const objs = <T,>(v: unknown[]): T[] => v.filter((x) => !!x && typeof x === 'object') as T[];
  merged.name = str(merged.name);
  merged.mbaId = str(merged.mbaId);
  merged.email = str(merged.email);
  merged.institute = str(merged.institute);
  merged.industryRightText = str(merged.industryRightText);
  merged.taglines = merged.taglines.map(str) as [string, string, string];
  merged.education = objs<SkynetResumeData['education'][number]>(merged.education).map((r) => ({
    ...r,
    degree: str(r.degree),
    institute: str(r.institute),
    gpa: str(r.gpa),
    year: str(r.year),
  }));
  for (const key of ['distinctions', 'projects', 'entrepreneurial', 'extras'] as const) {
    merged[key] = objs<SkynetResumeData['distinctions'][number]>(merged[key]).map((g) => ({
      ...g,
      category: str(g.category),
      bullets: objs<SkynetResumeData['distinctions'][number]['bullets'][number]>(
        Array.isArray(g.bullets) ? g.bullets : []
      ).map((b) => ({ ...b, text: str(b.text), year: str(b.year) })),
    }));
  }
  merged.experience = objs<SkynetResumeData['experience'][number]>(merged.experience).map((e) => ({
    ...e,
    type: str(e.type),
    firm: str(e.firm),
    role: str(e.role),
    dates: str(e.dates),
    subSections: objs<SkynetResumeData['experience'][number]['subSections'][number]>(
      Array.isArray(e.subSections) ? e.subSections : []
    ).map((s) => ({ ...s, label: str(s.label), bullets: strs(s.bullets) })),
  }));
  merged.positions = objs<SkynetResumeData['positions'][number]>(merged.positions).map((p) => ({
    ...p,
    title: str(p.title),
    year: str(p.year),
    bullets: strs(p.bullets),
  }));

  // Custom sections. Drop anything malformed rather than let a bad draft
  // render an untitled section or crash the label lookup.
  merged.customSections = (
    Array.isArray(merged.customSections) ? merged.customSections : []
  )
    .filter(
      (c): c is CustomSection =>
        !!c && typeof c.key === 'string' && isCustomKey(c.key) && Array.isArray(c.groups)
    )
    .map((c) => ({
      ...c,
      label: typeof c.label === 'string' ? c.label : '',
      // Each group needs a category string and a bullets array to render.
      groups: c.groups
        .filter((g) => !!g && typeof g === 'object')
        .map((g) => ({
          ...g,
          category: typeof g.category === 'string' ? g.category : '',
          bullets: Array.isArray(g.bullets)
            ? g.bullets
                .filter((b) => !!b && typeof b === 'object')
                .map((b) => ({
                  ...b,
                  text: typeof b.text === 'string' ? b.text : '',
                  year: typeof b.year === 'string' ? b.year : '',
                }))
            : [],
        })),
    }));
  // Only string titles: a number or object here would crash every render.
  merged.sectionTitles = Object.fromEntries(
    Object.entries(
      merged.sectionTitles && typeof merged.sectionTitles === 'object' && !Array.isArray(merged.sectionTitles)
        ? merged.sectionTitles
        : {}
    ).filter(([, v]) => typeof v === 'string')
  );

  // A key is known if it is a built-in or names a custom section that still
  // exists. A custom key left in the order after its section was deleted would
  // render nothing but still occupy a row in the Sections panel.
  const customKeys = new Set(merged.customSections.map((c) => c.key));
  // Not a string (a hand-edited or corrupted draft) is never a section key;
  // isCustomKey would throw on it and blank the app on every load.
  const known = (k: SectionKey) =>
    typeof k === 'string' &&
    (isCustomKey(k) ? customKeys.has(k) : DEFAULT_SECTION_ORDER.includes(k));

  // Repair sectionOrder: drop unknown keys, append missing defaults, then any
  // custom section the order did not mention (a draft saved mid-edit).
  const seen = new Set<SectionKey>();
  const cleaned: SectionKey[] = [];
  for (const k of Array.isArray(merged.sectionOrder) ? merged.sectionOrder : []) {
    if (known(k) && !seen.has(k)) {
      cleaned.push(k);
      seen.add(k);
    }
  }
  for (const k of DEFAULT_SECTION_ORDER) if (!seen.has(k)) cleaned.push(k);
  for (const c of merged.customSections) if (!seen.has(c.key)) cleaned.push(c.key);
  merged.sectionOrder = cleaned;

  if (Array.isArray(input.hiddenSections)) {
    merged.hiddenSections = input.hiddenSections.filter(known);
  } else {
    // A draft saved before hiddenSections existed. Do NOT inherit the
    // blank-resume default here - that would hide a section the student has
    // already written content into. Derive it instead: hide only what is
    // genuinely empty, so nothing with content ever disappears.
    const contentOf: Record<string, unknown[]> = {
      education: merged.education,
      distinctions: merged.distinctions,
      projects: merged.projects,
      entrepreneurial: merged.entrepreneurial,
      industry: merged.experience,
      positions: merged.positions,
      extras: merged.extras,
    };
    for (const c of merged.customSections) contentOf[c.key] = c.groups;
    merged.hiddenSections = merged.sectionOrder.filter(
      (k) => (contentOf[k] ?? []).length === 0
    );
  }

  // Unknown values (a hand-edited or future draft) fall back to official.
  if (!isDensity(merged.density)) delete merged.density;
  if (merged.nameAlign !== 'left') delete merged.nameAlign;

  return sanitizeHidden(merged);
}
