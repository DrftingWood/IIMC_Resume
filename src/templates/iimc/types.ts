import { uid } from '@/lib/uid';

export type ResumeType = 'ranked' | 'unranked';

export type SectionKey =
  | 'education'
  | 'distinctions'
  | 'industry'
  | 'positions'
  | 'extras';

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'education',
  'distinctions',
  'industry',
  'positions',
  'extras',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  education: 'Academic Qualifications',
  distinctions: 'Academic Distinctions & Co-Curricular Achievements',
  industry: 'Industry Experience',
  positions: 'Positions of Responsibility',
  extras: 'Extra-Curricular Achievements',
};

/* ------------------------------ canonical shape --------------------------- */

/*
 * Every addressable entity carries a stable `id`. Ids are generated once, on
 * creation, and preserved across every edit and reorder — they are what a
 * review comment will point at. Editing a bullet's text must never mint a new
 * id, or the comments hanging off it are orphaned.
 */

export interface IimcResumeData {
  name: string;
  mbaId: string;
  taglines: [string, string, string];
  resumeType: ResumeType;
  sectionOrder: SectionKey[];
  education: EducationRow[];
  distinctions: BulletGroup[];
  industryRightText: string;
  experience: ExperienceEntry[];
  positions: PositionEntry[];
  extras: BulletGroup[];
  email: string;
  institute: string;
}

export interface EducationRow {
  id: string;
  degree: string;
  institute: string;
  gpa: string;
  rank?: string;
  year: string;
}

/** A reviewable resume point. */
export interface Bullet {
  id: string;
  text: string;
}

export interface YearedBullet extends Bullet {
  year: string;
}

export interface BulletGroup {
  id: string;
  category: string;
  bullets: YearedBullet[];
}

export interface ExperienceSubSection {
  id: string;
  label: string;
  bullets: Bullet[];
}

export interface ExperienceEntry {
  id: string;
  type: string;
  firm: string;
  role: string;
  dates: string;
  subSections: ExperienceSubSection[];
}

export interface PositionEntry {
  id: string;
  title: string;
  bullets: Bullet[];
  year: string;
}

/* -------------------------------- factories ------------------------------- */

export function newBullet(text = ''): Bullet {
  return { id: uid('b'), text };
}

export function newYearedBullet(text = '', year = ''): YearedBullet {
  return { id: uid('b'), text, year };
}

export function newBulletGroup(category = ''): BulletGroup {
  return { id: uid('grp'), category, bullets: [] };
}

export function newEducationRow(): EducationRow {
  return { id: uid('edu'), degree: '', institute: '', gpa: '', rank: '', year: '' };
}

export function newExperienceSubSection(label = ''): ExperienceSubSection {
  return { id: uid('sub'), label, bullets: [] };
}

export function newExperienceEntry(type = 'Full Time'): ExperienceEntry {
  return { id: uid('exp'), type, firm: '', role: '', dates: '', subSections: [] };
}

export function newPositionEntry(): PositionEntry {
  return { id: uid('pos'), title: '', bullets: [], year: '' };
}

export function emptyIimcResume(): IimcResumeData {
  return {
    name: '',
    mbaId: '',
    taglines: ['', '', ''],
    resumeType: 'unranked',
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    education: [],
    distinctions: [],
    industryRightText: '',
    experience: [],
    positions: [],
    extras: [],
    email: '',
    institute: 'Indian Institute of Management Calcutta',
  };
}

/* --------------------------------- input ---------------------------------- */

/*
 * Tolerant shapes accepted by `hydrateIimc`. Two sources feed it:
 *   - drafts persisted before ids existed (bullets were bare strings), and
 *   - hand-written literals such as sample.ts.
 * Both are normalised into the canonical shape above, so nothing downstream
 * has to consider the legacy form.
 */

export type BulletInput = string | { id?: string; text?: string; year?: string };

export interface EducationRowInput {
  id?: string;
  degree?: string;
  institute?: string;
  gpa?: string;
  rank?: string;
  year?: string;
}

export interface BulletGroupInput {
  id?: string;
  category?: string;
  bullets?: BulletInput[];
}

export interface ExperienceSubSectionInput {
  id?: string;
  label?: string;
  bullets?: BulletInput[];
}

export interface ExperienceEntryInput {
  id?: string;
  type?: string;
  firm?: string;
  role?: string;
  dates?: string;
  subSections?: ExperienceSubSectionInput[];
}

export interface PositionEntryInput {
  id?: string;
  title?: string;
  bullets?: BulletInput[];
  year?: string;
}

export interface IimcResumeInput {
  name?: string;
  mbaId?: string;
  taglines?: string[];
  resumeType?: ResumeType;
  sectionOrder?: SectionKey[];
  education?: EducationRowInput[];
  distinctions?: BulletGroupInput[];
  industryRightText?: string;
  experience?: ExperienceEntryInput[];
  positions?: PositionEntryInput[];
  extras?: BulletGroupInput[];
  email?: string;
  institute?: string;
}
