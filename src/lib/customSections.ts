/**
 * Section keys for sections a student adds themselves.
 *
 * The seven (Skynet) / five (Superset) built-in keys stay a closed union so
 * every `switch` over them remains exhaustive and the parsers, which can only
 * ever emit built-ins, need no changes. Custom sections live in a separate
 * `custom:` namespace that widens the key type without widening it to `string`.
 */
export type CustomSectionKey = `custom:${string}`;

export const CUSTOM_PREFIX = 'custom:';

export function isCustomKey(key: string): key is CustomSectionKey {
  return key.startsWith(CUSTOM_PREFIX);
}

/**
 * The lowest `custom:N` not already taken. A counter rather than a timestamp
 * or a random id: two adds in the same millisecond would collide on
 * `Date.now()`, and a deterministic key keeps tests readable. Reusing the key
 * of a deleted section is harmless — nothing else references it once its
 * entries are gone from `sectionOrder` and `hiddenSections`.
 */
export function newCustomKey(taken: readonly string[]): CustomSectionKey {
  const used = new Set(taken);
  let n = 1;
  while (used.has(`${CUSTOM_PREFIX}${n}`)) n += 1;
  return `${CUSTOM_PREFIX}${n}`;
}

/** Shown wherever a custom section has been left without a title. */
export const UNTITLED_SECTION = 'Untitled Section';
