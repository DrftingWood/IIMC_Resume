import type { IimcResumeData, SectionKey } from './types';
import { emptyIimcResume, DEFAULT_SECTION_ORDER } from './types';

export function hydrateIimc(input: Partial<IimcResumeData>): IimcResumeData {
  const base = emptyIimcResume();
  const merged: IimcResumeData = { ...base, ...input } as IimcResumeData;

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

  return merged;
}
