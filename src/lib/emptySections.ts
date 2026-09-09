import type { TemplateKey } from '@/templates/types';

/** Data key that holds a section's content, per section key. */
const CONTENT_KEY: Record<string, string> = {
  education: 'education',
  distinctions: 'distinctions',
  projects: 'projects',
  entrepreneurial: 'entrepreneurial',
  industry: 'experience',
  positions: 'positions',
  extras: 'extras',
};

const LABELS: Record<string, string> = {
  education: 'Academic Profile',
  distinctions: 'Academic Distinctions',
  projects: 'Projects and Papers',
  entrepreneurial: 'Entrepreneurial/Non-Profit Venture',
  industry: 'Industry Experience',
  positions: 'Position of Responsibility',
  extras: 'Extra-Curricular Achievements',
};

/**
 * Sections that are switched ON but hold nothing. They render as a bare
 * section bar with no rows under it and print that way — visible in the
 * exported PDF, and easy to miss on screen while scrolling.
 */
export function emptyVisibleSections(
  templateId: TemplateKey | null,
  data: unknown
): string[] {
  if (!templateId || !data) return [];
  const d = data as Record<string, unknown>;

  // Say nothing about a resume that has not been started. On a blank one every
  // section is empty by definition, and opening with "everything is empty" is
  // noise, not guidance. This is for the case that actually costs a student
  // marks: a mostly-filled resume with one section left switched on and blank.
  const hasAnyContent = Object.values(CONTENT_KEY).some(
    (k) => Array.isArray(d[k]) && (d[k] as unknown[]).length > 0
  );
  if (!hasAnyContent) return [];
  const order = Array.isArray(d.sectionOrder) ? (d.sectionOrder as string[]) : [];
  const hidden = new Set(Array.isArray(d.hiddenSections) ? (d.hiddenSections as string[]) : []);
  return order
    .filter((k) => !hidden.has(k))
    .filter((k) => {
      const arr = d[CONTENT_KEY[k] ?? k];
      return Array.isArray(arr) && arr.length === 0;
    })
    .map((k) => LABELS[k] ?? k);
}
