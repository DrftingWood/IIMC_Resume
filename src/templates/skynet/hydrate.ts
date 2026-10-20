import type { SkynetResumeData, SectionKey, CustomSection } from './types';
import { emptySkynetResume, DEFAULT_SECTION_ORDER } from './types';
import { isCustomKey } from '@/lib/customSections';

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

  return merged;
}
