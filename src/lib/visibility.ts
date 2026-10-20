/**
 * Hide/show for individual points and whole entries.
 *
 * Students keep a bank of more points than fit on the one-page F1 resume and
 * switch each one on or off. A hidden item stays in the data and the editor;
 * it is only left out of what gets drawn. Both templates share these shapes,
 * so one pass serves Superset and Skynet alike.
 *
 * Objects carry their own `hidden` flag. Experience and position bullets are
 * plain strings, so their flags live in a parallel `hiddenBullets` list that
 * the editor moves and deletes in step with the bullets.
 */

interface Hideable {
  hidden?: boolean;
}

interface Group extends Hideable {
  bullets: Hideable[];
}

interface StringBullets extends Hideable {
  bullets: string[];
  hiddenBullets?: boolean[];
}

interface Entry extends Hideable {
  subSections: StringBullets[];
}

const GROUP_KEYS = ['distinctions', 'projects', 'entrepreneurial', 'extras'] as const;

// Null-safe: a corrupted draft can hold null entries, and this runs at boot.
const shown = <T extends Hideable>(x: T | null | undefined): x is T => !!x && !x.hidden;
const list = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

function visibleGroups<T extends Group>(groups: T[]): T[] {
  return groups.filter(shown).flatMap((g) => {
    const bullets = list<Hideable>(g.bullets).filter(shown);
    // A group whose every point is hidden would print as a bare category cell.
    if (g.bullets.length > 0 && bullets.length === 0) return [];
    return [{ ...g, bullets }];
  });
}

function visibleStringBullets<T extends StringBullets>(items: T[]): T[] {
  return items.filter(shown).flatMap((item) => {
    const flags = list<boolean>(item.hiddenBullets);
    const all = list<string>(item.bullets);
    const bullets = all.filter((_, i) => !flags[i]);
    if (all.length > 0 && bullets.length === 0) return [];
    const { hiddenBullets: _flags, ...rest } = item;
    return [{ ...rest, bullets } as T];
  });
}

/** The resume as it should be drawn: every hidden point and entry left out.
    Returns a new object; the input is not touched. */
export function withoutHidden<T>(data: T): T {
  const d = data as Record<string, unknown>;
  const out: Record<string, unknown> = { ...d };

  if (Array.isArray(d.education)) out.education = (d.education as Hideable[]).filter(shown);
  for (const key of GROUP_KEYS) {
    if (Array.isArray(d[key])) out[key] = visibleGroups(d[key] as Group[]);
  }
  if (Array.isArray(d.customSections)) {
    out.customSections = (d.customSections as { groups: Group[] }[]).filter(Boolean).map((c) => ({
      ...c,
      groups: Array.isArray(c.groups) ? visibleGroups(c.groups) : c.groups,
    }));
  }
  if (Array.isArray(d.experience)) {
    out.experience = (d.experience as Entry[]).filter(shown).flatMap((e) => {
      const subs = list<StringBullets>(e.subSections);
      const subSections = visibleStringBullets(subs);
      // Every sub-section hidden: the entry goes too, rather than printing a
      // firm banner with nothing under it.
      if (subs.length > 0 && subSections.length === 0) return [];
      return [{ ...e, subSections }];
    });
  }
  if (Array.isArray(d.positions)) {
    out.positions = visibleStringBullets(d.positions as StringBullets[]);
  }
  return out as T;
}

function cleanFlags(item: StringBullets) {
  if (!item || item.hiddenBullets === undefined) return;
  if (!Array.isArray(item.hiddenBullets) || !Array.isArray(item.bullets)) {
    delete item.hiddenBullets;
    return;
  }
  item.hiddenBullets = item.bullets.map((_, i) => item.hiddenBullets![i] === true);
}

function cleanHidden(item: Hideable) {
  if (!item || typeof item !== 'object') return;
  // Anything but a real boolean is dropped, which leaves the item visible.
  if (item.hidden !== undefined && typeof item.hidden !== 'boolean') delete item.hidden;
}

/** Repair hidden flags on a loaded draft so a stale or hand-edited save cannot
    misalign a flag with its bullet. Mutates and returns `data`, matching the
    hydrate functions that call it. Drafts saved before this feature carry no
    flags and come through untouched, so everything in them stays visible. */
export function sanitizeHidden<T>(data: T): T {
  const d = data as Record<string, unknown>;
  const each = (key: string, fn: (x: never) => void) => {
    if (Array.isArray(d[key])) (d[key] as never[]).forEach(fn);
  };
  const groups = (gs: Group[]) =>
    gs.forEach((g) => {
      cleanHidden(g);
      if (g && Array.isArray(g.bullets)) g.bullets.forEach(cleanHidden);
    });

  each('education', cleanHidden);
  for (const key of GROUP_KEYS) if (Array.isArray(d[key])) groups(d[key] as Group[]);
  each('customSections', (c: { groups?: Group[] }) => c && Array.isArray(c.groups) && groups(c.groups));
  each('experience', (e: Entry) => {
    cleanHidden(e);
    list<StringBullets>(e?.subSections).forEach((s) => {
      cleanHidden(s);
      cleanFlags(s);
    });
  });
  each('positions', (p: StringBullets) => {
    cleanHidden(p);
    cleanFlags(p);
  });
  return data;
}

function padded(flags: boolean[] | undefined, length: number): boolean[] {
  return Array.from({ length }, (_, i) => flags?.[i] === true);
}

/** Flip the hidden flag of bullet `i` in a list of `length` bullets. */
export function toggleFlag(flags: boolean[] | undefined, i: number, length: number): boolean[] {
  const out = padded(flags, length);
  out[i] = !out[i];
  return out;
}

/** Move bullet `i`'s flag one step, in step with the bullet itself. */
export function moveFlag(
  flags: boolean[] | undefined,
  i: number,
  dir: -1 | 1,
  length: number
): boolean[] {
  const out = padded(flags, length);
  const j = i + dir;
  if (j < 0 || j >= length) return out;
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** Drop bullet `i`'s flag when the bullet is deleted. */
export function removeFlag(flags: boolean[] | undefined, i: number, length: number): boolean[] {
  return padded(flags, length).filter((_, k) => k !== i);
}
