import type {
  Bullet,
  BulletGroup,
  BulletGroupInput,
  BulletInput,
  EducationRow,
  EducationRowInput,
  ExperienceEntry,
  ExperienceEntryInput,
  ExperienceSubSection,
  ExperienceSubSectionInput,
  IimcResumeData,
  IimcResumeInput,
  PositionEntry,
  PositionEntryInput,
  SectionKey,
  YearedBullet,
} from './types';
import { emptyIimcResume, DEFAULT_SECTION_ORDER } from './types';
import { uid } from '@/lib/uid';

/* Ids present on the input are always preserved — regenerating one would
 * orphan any review thread anchored to it. Only missing ids are minted. */

function toBullet(input: BulletInput): Bullet {
  if (typeof input === 'string') return { id: uid('b'), text: input };
  return { id: input.id || uid('b'), text: input.text ?? '' };
}

function toYearedBullet(input: BulletInput): YearedBullet {
  if (typeof input === 'string') return { id: uid('b'), text: input, year: '' };
  return { id: input.id || uid('b'), text: input.text ?? '', year: input.year ?? '' };
}

function toArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function toEducationRow(input: EducationRowInput): EducationRow {
  return {
    id: input.id || uid('edu'),
    degree: input.degree ?? '',
    institute: input.institute ?? '',
    gpa: input.gpa ?? '',
    rank: input.rank ?? '',
    year: input.year ?? '',
  };
}

function toBulletGroup(input: BulletGroupInput): BulletGroup {
  return {
    id: input.id || uid('grp'),
    category: input.category ?? '',
    bullets: toArray(input.bullets).map(toYearedBullet),
  };
}

function toSubSection(input: ExperienceSubSectionInput): ExperienceSubSection {
  return {
    id: input.id || uid('sub'),
    label: input.label ?? '',
    bullets: toArray(input.bullets).map(toBullet),
  };
}

function toExperienceEntry(input: ExperienceEntryInput): ExperienceEntry {
  return {
    id: input.id || uid('exp'),
    type: input.type ?? '',
    firm: input.firm ?? '',
    role: input.role ?? '',
    dates: input.dates ?? '',
    subSections: toArray(input.subSections).map(toSubSection),
  };
}

function toPositionEntry(input: PositionEntryInput): PositionEntry {
  return {
    id: input.id || uid('pos'),
    title: input.title ?? '',
    bullets: toArray(input.bullets).map(toBullet),
    year: input.year ?? '',
  };
}

/**
 * Normalise any accepted input into the canonical resume shape.
 *
 * Handles three cases in one pass: fresh parser output, hand-written literals,
 * and drafts persisted before ids existed (where bullets were bare strings).
 * Every path out of here has ids on every entity.
 */
export function hydrateIimc(input: IimcResumeInput): IimcResumeData {
  const base = emptyIimcResume();
  const merged: IimcResumeData = {
    ...base,
    ...(input as Partial<IimcResumeData>),
    education: toArray(input.education).map(toEducationRow),
    distinctions: toArray(input.distinctions).map(toBulletGroup),
    experience: toArray(input.experience).map(toExperienceEntry),
    positions: toArray(input.positions).map(toPositionEntry),
    extras: toArray(input.extras).map(toBulletGroup),
  };

  if (!merged.resumeType) merged.resumeType = 'unranked';
  if (!Array.isArray(merged.taglines) || merged.taglines.length !== 3) {
    merged.taglines = ['', '', ''];
  }

  // Repair sectionOrder: drop unknown keys, append missing defaults.
  if (!Array.isArray(merged.sectionOrder) || merged.sectionOrder.length === 0) {
    merged.sectionOrder = [...DEFAULT_SECTION_ORDER];
  } else {
    const seen = new Set<SectionKey>();
    const cleaned: SectionKey[] = [];
    for (const k of merged.sectionOrder) {
      if (DEFAULT_SECTION_ORDER.includes(k) && !seen.has(k)) {
        cleaned.push(k);
        seen.add(k);
      }
    }
    for (const k of DEFAULT_SECTION_ORDER) {
      if (!seen.has(k)) cleaned.push(k);
    }
    merged.sectionOrder = cleaned;
  }

  return merged;
}
