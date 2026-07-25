import type { AnyTemplateConfig, TemplateKey } from './types';
import type { University } from '@/lib/universities';
import { UNIVERSITIES, getUniversity } from '@/lib/universities';
import { iimcTemplate } from './iimc';
import { devcvTemplate } from './devcv';

/** Order matters: it is the priority order for PDF detection on upload. */
export const TEMPLATES: AnyTemplateConfig[] = [iimcTemplate, devcvTemplate];

export function getTemplate(id: TemplateKey | string): AnyTemplateConfig | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function isTemplateKey(id: string): boolean {
  return TEMPLATES.some((t) => t.id === id);
}

/** Templates owned by a university, or the university-agnostic ones for null. */
export function getTemplatesForUniversity(universityId: string | null): AnyTemplateConfig[] {
  return TEMPLATES.filter((t) => t.universityId === universityId);
}

export function getUniversityForTemplate(id: TemplateKey): University | undefined {
  return getUniversity(getTemplate(id)?.universityId);
}

export interface TemplateGroup {
  /** null for the university-agnostic bucket. */
  university: University | null;
  templates: AnyTemplateConfig[];
}

/**
 * Templates bucketed by owning university, universities first (in registry
 * order) and the generic bucket last. Empty buckets are dropped.
 */
export function groupTemplatesByUniversity(): TemplateGroup[] {
  const groups: TemplateGroup[] = [];

  for (const university of UNIVERSITIES) {
    const templates = getTemplatesForUniversity(university.id);
    if (templates.length) groups.push({ university, templates });
  }

  const generic = getTemplatesForUniversity(null);
  if (generic.length) groups.push({ university: null, templates: generic });

  // A template pointing at an unknown university id would otherwise vanish
  // from the gallery — surface it in the generic bucket instead.
  const grouped = new Set(groups.flatMap((g) => g.templates));
  const orphans = TEMPLATES.filter((t) => !grouped.has(t));
  if (orphans.length) {
    const genericGroup = groups.find((g) => g.university === null);
    if (genericGroup) genericGroup.templates.push(...orphans);
    else groups.push({ university: null, templates: orphans });
  }

  return groups;
}
