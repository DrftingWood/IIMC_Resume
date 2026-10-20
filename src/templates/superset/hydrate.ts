import type { SupersetResumeData, SectionKey, CustomSection } from './types';
import { emptySupersetResume, DEFAULT_SECTION_ORDER } from './types';
import { isCustomKey } from '@/lib/customSections';
import { sanitizeHidden } from '@/lib/visibility';

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
  ).filter(
    (c): c is CustomSection =>
      !!c && typeof c.key === 'string' && isCustomKey(c.key) && Array.isArray(c.groups)
  );
  merged.sectionTitles =
    merged.sectionTitles && typeof merged.sectionTitles === 'object'
      ? merged.sectionTitles
      : {};

  // A key is known if it is a built-in or names a custom section that still
  // exists. A custom key left in the order after its section was deleted would
  // render nothing but still occupy a row in the Sections panel.
  const customKeys = new Set(merged.customSections.map((c) => c.key));
  const known = (k: SectionKey) =>
    isCustomKey(k) ? customKeys.has(k) : DEFAULT_SECTION_ORDER.includes(k);

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

  return sanitizeHidden(merged);
}
