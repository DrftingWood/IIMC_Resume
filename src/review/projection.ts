import type { ScalarEntity } from './types';

/**
 * Client twin of public.jsonb_collect_entities().
 *
 * Walks a resume document and returns every object whose `id` is in `ids`,
 * reduced to its scalar fields. Nested arrays and objects are dropped so that
 * naming a container id cannot leak the children inside it — the worst case
 * for a wrong id is too little data, never too much.
 *
 * Kept deliberately in step with the SQL version; if one changes, change both.
 */
export function collectEntities(node: unknown, ids: string[]): ScalarEntity[] {
  if (!ids.length) return [];
  const wanted = new Set(ids);
  const out: ScalarEntity[] = [];

  function walk(value: unknown): void {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (value === null || typeof value !== 'object') return;

    const obj = value as Record<string, unknown>;
    const id = obj.id;
    if (typeof id === 'string' && wanted.has(id)) {
      const scalar: Record<string, string | number | boolean | null> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) {
          scalar[k] = v as string | number | boolean | null;
        }
      }
      out.push(scalar as ScalarEntity);
    }

    for (const v of Object.values(obj)) walk(v);
  }

  walk(node);
  return out;
}

/** Find one entity's `text` in a document, or null if it is gone. */
export function findEntityText(node: unknown, entityId: string): string | null {
  const [hit] = collectEntities(node, [entityId]);
  if (!hit) return null;
  return typeof hit.text === 'string' ? hit.text : null;
}

/**
 * Replace the `text` of the entity with the given id, returning a new document.
 * The original is not mutated. Used when the owner accepts a suggestion.
 */
export function replaceEntityText<T>(node: T, entityId: string, text: string): T {
  function walk(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(walk);
    if (value === null || typeof value !== 'object') return value;

    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) next[k] = walk(v);
    if (obj.id === entityId && typeof obj.text === 'string') next.text = text;
    return next;
  }
  return walk(node) as T;
}

/**
 * True when the live document has moved on from what the commenter read.
 *
 * This is the payoff of pinning a review to a version: rather than silently
 * showing old feedback against new text, the UI can mark it stale.
 */
export function isOutdated(
  liveData: unknown,
  versionData: unknown,
  entityId: string | null
): boolean {
  if (!entityId) return false;
  const live = findEntityText(liveData, entityId);
  const pinned = findEntityText(versionData, entityId);
  if (live === null || pinned === null) return live !== pinned;
  return live !== pinned;
}
