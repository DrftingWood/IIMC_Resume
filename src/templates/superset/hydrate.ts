import type { SupersetResumeData, SectionKey, CustomSection } from './types';
import { emptySupersetResume, DEFAULT_SECTION_ORDER } from './types';
import { isCustomKey } from '@/lib/customSections';
import { sanitizeHidden } from '@/lib/visibility';
import { isDensity } from '@/lib/density';

export function hydrateSuperset(input: Partial<SupersetResumeData>): SupersetResumeData {
  const base = emptySupersetResume();
  const merged: SupersetResumeData = { ...base, ...input } as SupersetResumeData;

  if (!merged.resumeType) merged.resumeType = 'unranked';
  if (!Array.isArray(merged.taglines) || merged.taglines.length !== 3) {
    merged.taglines = ['', '', ''];
  }
  for (const key of ['distinctions', 'extras', 'education', 'experience', 'positions'] as const) {
    if (!Array.isArray(merged[key])) (merged as never as Record<string, unknown>)[key] = [];
  }

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

  merged.hiddenSections = (
    Array.isArray(merged.hiddenSections) ? merged.hiddenSections : []
  ).filter(known);

  // Unknown values (a hand-edited or future draft) fall back to official.
  if (!isDensity(merged.density)) delete merged.density;
  if (merged.nameAlign !== 'left') delete merged.nameAlign;

  return sanitizeHidden(merged);
}
