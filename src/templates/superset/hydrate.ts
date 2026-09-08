import type { SupersetResumeData, SectionKey } from './types';
import { emptySupersetResume, DEFAULT_SECTION_ORDER } from './types';

export function hydrateSuperset(input: Partial<SupersetResumeData>): SupersetResumeData {
  const base = emptySupersetResume();
  const merged: SupersetResumeData = { ...base, ...input } as SupersetResumeData;

  if (!merged.resumeType) merged.resumeType = 'unranked';
  if (!Array.isArray(merged.taglines) || merged.taglines.length !== 3) {
    merged.taglines = ['', '', ''];
  }

  // Repair sectionOrder: drop unknown keys, append missing defaults.
  if (!Array.isArray(merged.sectionOrder) || merged.sectionOrder.length === 0) {
    merged.sectionOrder = [...DEFAULT_SECTION_ORDER];
  } else {
    const seen = new Set<SectionKey>();
    const cleaned: SectionKey[] = [];
    for (const k of merged.sectionOrder) {
      if (DEFAULT_SECTION_ORDER.includes(k) && !seen.has(k)) {
        cleaned.push(k);
        seen.add(k);
      }
    }
    for (const k of DEFAULT_SECTION_ORDER) {
      if (!seen.has(k)) cleaned.push(k);
    }
    merged.sectionOrder = cleaned;
  }

  merged.hiddenSections = (Array.isArray(merged.hiddenSections) ? merged.hiddenSections : [])
    .filter((k) => DEFAULT_SECTION_ORDER.includes(k));

  return merged;
}
