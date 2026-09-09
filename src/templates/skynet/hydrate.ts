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

  if (Array.isArray(input.hiddenSections)) {
    merged.hiddenSections = input.hiddenSections.filter((k) =>
      DEFAULT_SECTION_ORDER.includes(k)
    );
  } else {
    // A draft saved before hiddenSections existed. Do NOT inherit the
    // blank-resume default here - that would hide a section the student has
    // already written content into. Derive it instead: hide only what is
    // genuinely empty, so nothing with content ever disappears.
    const contentOf: Record<SectionKey, unknown[]> = {
      education: merged.education,
      distinctions: merged.distinctions,
      projects: merged.projects,
      entrepreneurial: merged.entrepreneurial,
      industry: merged.experience,
      positions: merged.positions,
      extras: merged.extras,
    };
    merged.hiddenSections = DEFAULT_SECTION_ORDER.filter(
      (k) => (contentOf[k] ?? []).length === 0
    );
  }

  return merged;
}
