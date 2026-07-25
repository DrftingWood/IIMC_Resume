let counter = 0;

/**
 * Unique id for a client-generated entity (bullet, row, section).
 *
 * These are used as React keys today. More importantly they are the anchor
 * that review comments will attach to: a comment points at a bullet id, so
 * reordering or editing surrounding content never orphans a thread. Once a
 * bullet has an id, that id must survive edits — never regenerate on change.
 */
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}
