import type { TemplateKey } from '@/templates/types';
import { hydrateSuperset } from '@/templates/superset/hydrate';
import { hydrateSkynet } from '@/templates/skynet/hydrate';

const SHARED_KEYS = [
  'name', 'mbaId', 'taglines', 'education', 'distinctions',
  'experience', 'industryRightText', 'positions', 'extras', 'email', 'institute',
  'sectionOrder',
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

  return { data: hydrateSkynet(carried as never), dropped };
}
