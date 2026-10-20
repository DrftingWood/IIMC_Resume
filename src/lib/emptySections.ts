import type { TemplateKey } from '@/templates/types';
import { withoutHidden } from '@/lib/visibility';
import { isCustomKey } from '@/lib/customSections';
import { sectionLabel as skynetLabel } from '@/templates/skynet/types';
import { sectionLabel as supersetLabel } from '@/templates/superset/types';

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

/** Rows a section would print: bullet groups count their points, since a
    group with no points draws nothing; other sections count entries. */
function rowCount(d: Record<string, unknown>, key: string): number {
  if (isCustomKey(key)) {
    const custom = (Array.isArray(d.customSections) ? d.customSections : []) as {
      key: string;
      groups?: { bullets?: unknown[] }[];
    }[];
    const groups = custom.find((c) => c?.key === key)?.groups;
    return Array.isArray(groups)
      ? groups.reduce((n, g) => n + (Array.isArray(g?.bullets) ? g.bullets.length : 0), 0)
      : 0;
  }
  const arr = d[CONTENT_KEY[key] ?? key];
  return Array.isArray(arr) ? arr.length : 0;
}

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
  // Judge what prints: a section whose every entry is hidden prints empty too.
  const d = withoutHidden(data) as Record<string, unknown>;
  const order = Array.isArray(d.sectionOrder) ? (d.sectionOrder as string[]) : [];

  // Say nothing about a resume that has not been started. On a blank one every
  // section is empty by definition, and opening with "everything is empty" is
  // noise, not guidance. This is for the case that actually costs a student
  // marks: a mostly-filled resume with one section left switched on and blank.
  if (!order.some((k) => rowCount(d, k) > 0)) return [];

  // Name each section as the page prints it: renamed, custom or official.
  const label = (k: string) =>
    templateId === 'superset'
      ? supersetLabel(data as never, k as never)
      : skynetLabel(data as never, k as never);

  const hidden = new Set(Array.isArray(d.hiddenSections) ? (d.hiddenSections as string[]) : []);
  return order
    .filter((k) => !hidden.has(k))
    .filter((k) => rowCount(d, k) === 0)
    .map(label);
}
