import type { TemplateKey } from '@/templates/types';
import { hydrateSuperset } from '@/templates/superset/hydrate';
import { hydrateSkynet } from '@/templates/skynet/hydrate';

// Fields carried verbatim across a format switch, in either direction.
// `resumeType` exists only on Superset (SkynetResumeData has no such field),
// but it is still listed here rather than in SKYNET_ONLY / dropped: carrying
// it lets a Superset -> Skynet -> Superset round trip keep the student's
// Rank column intact. hydrateSkynet does not know about `resumeType` (it is
// not part of SkynetResumeData), so the extra property just rides along
// unused on the in-memory Skynet object until the student switches back,
// at which point hydrateSuperset reads it again. If it were omitted here,
// hydrateSuperset would silently reset it to 'unranked' on the way back.
export const SHARED_KEYS = [
  'name', 'mbaId', 'taglines', 'education', 'distinctions',
  'experience', 'industryRightText', 'positions', 'extras', 'email', 'institute',
  'sectionOrder', 'hiddenSections', 'resumeType',
] as const;

/** Sections that exist only in Skynet, with the labels shown in the confirm. */
const SKYNET_ONLY: { key: string; label: string }[] = [
  { key: 'projects', label: 'Projects and Papers' },
  { key: 'entrepreneurial', label: 'Entrepreneurial/Non-Profit Venture' },
];

export function migrateBetweenBatches(
  from: TemplateKey,
  to: TemplateKey,
  data: unknown
): { data: unknown; dropped: string[] } {
  const src = (data ?? {}) as Record<string, unknown>;
  const carried: Record<string, unknown> = {};
  for (const k of SHARED_KEYS) {
    if (src[k] !== undefined) carried[k] = src[k];
  }

  const dropped: string[] = [];
  if (from === 'skynet' && to === 'superset') {
    for (const { key, label } of SKYNET_ONLY) {
      const v = src[key];
      if (Array.isArray(v) && v.length > 0) dropped.push(label);
    }
    return { data: hydrateSuperset(carried as never), dropped };
  }

  const skynetData = hydrateSkynet(carried as never);
  // A migration INTO Skynet can leave `projects` / `entrepreneurial` empty
  // — Superset never has them, and a prior Skynet -> Superset hop also
  // drops their content (see SKYNET_ONLY above). An empty section that is
  // NOT hidden renders a bare section bar with no content into the
  // exported PDF, so hide it automatically rather than leave that visible.
  const hidden = new Set(skynetData.hiddenSections);
  for (const key of ['projects', 'entrepreneurial'] as const) {
    if (skynetData[key].length === 0) hidden.add(key);
  }
  skynetData.hiddenSections = [...hidden];

  return { data: skynetData, dropped };
}
