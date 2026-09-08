import type { SkynetResumeData, SectionKey } from './types';
import { emptySkynetResume, DEFAULT_SECTION_ORDER } from './types';

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

  // Repair sectionOrder: drop unknown keys, append missing defaults.
  const seen = new Set<SectionKey>();
  const cleaned: SectionKey[] = [];
  for (const k of Array.isArray(merged.sectionOrder) ? merged.sectionOrder : []) {
    if (DEFAULT_SECTION_ORDER.includes(k) && !seen.has(k)) {
      cleaned.push(k);
      seen.add(k);
    }
  }
  for (const k of DEFAULT_SECTION_ORDER) if (!seen.has(k)) cleaned.push(k);
  merged.sectionOrder = cleaned;

  merged.hiddenSections = (Array.isArray(merged.hiddenSections) ? merged.hiddenSections : [])
    .filter((k) => DEFAULT_SECTION_ORDER.includes(k));

  return merged;
}
