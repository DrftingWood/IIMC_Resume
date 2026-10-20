export type ResumeType = 'ranked' | 'unranked';

import type { CustomSectionKey } from '@/lib/customSections';
import { isCustomKey, UNTITLED_SECTION } from '@/lib/customSections';

/** The five sections the 61st-batch-and-prior format defines. Closed, so the
    parser's switches stay exhaustive. */
export type BuiltInSectionKey =
  | 'education'
  | 'distinctions'
  | 'industry'
  | 'positions'
  | 'extras';

/** A built-in section, or one the student added. */
export type SectionKey = BuiltInSectionKey | CustomSectionKey;

export const DEFAULT_SECTION_ORDER: BuiltInSectionKey[] = [
  'education',
  'distinctions',
  'industry',
  'positions',
  'extras',
];

export const SECTION_LABELS: Record<BuiltInSectionKey, string> = {
  education: 'Academic Qualifications',
  distinctions: 'Academic Distinctions & Co-Curricular Achievements',
  industry: 'Industry Experience',
  positions: 'Positions of Responsibility',
  extras: 'Extra-Curricular Achievements',
};

export interface SupersetResumeData {
  name: string;
  mbaId: string;
  taglines: [string, string, string];
  resumeType: ResumeType;
  sectionOrder: SectionKey[];
  hiddenSections: SectionKey[];
  /** Renamed built-in headers. Absent key = the official title in
      SECTION_LABELS, which is what Reset restores. */
  sectionTitles: Partial<Record<BuiltInSectionKey, string>>;
  customSections: CustomSection[];
  education: EducationRow[];
  distinctions: BulletGroup[];
  industryRightText: string;
  experience: ExperienceEntry[];
  positions: PositionEntry[];
  extras: BulletGroup[];
  email: string;
  institute: string;
}

/** A section the student added. Its content is a bullet table, the shape
    Distinctions and Extra-Curricular already use. */
export interface CustomSection {
  key: CustomSectionKey;
  label: string;
  groups: BulletGroup[];
}

export interface EducationRow {
  degree: string;
  institute: string;
  gpa: string;
  rank?: string;
  year: string;
  /** Left out of the preview and PDF but kept in the editor. */
  hidden?: boolean;
}

export interface YearedBullet {
  text: string;
  year: string;
  /** Left out of the preview and PDF but kept in the editor. */
  hidden?: boolean;
}

export interface BulletGroup {
  category: string;
  bullets: YearedBullet[];
  /** Left out of the preview and PDF but kept in the editor. */
  hidden?: boolean;
}

export interface ExperienceSubSection {
  label: string;
  bullets: string[];
  /** Left out of the preview and PDF but kept in the editor. */
  hidden?: boolean;
  /** Per-bullet hidden flags, parallel to `bullets`. */
  hiddenBullets?: boolean[];
}

export interface ExperienceEntry {
  type: string;
  firm: string;
  role: string;
  dates: string;
  subSections: ExperienceSubSection[];
  /** Left out of the preview and PDF but kept in the editor. */
  hidden?: boolean;
}

export interface PositionEntry {
  title: string;
  bullets: string[];
  year: string;
  /** Left out of the preview and PDF but kept in the editor. */
  hidden?: boolean;
  /** Per-bullet hidden flags, parallel to `bullets`. */
  hiddenBullets?: boolean[];
}

export function emptySupersetResume(): SupersetResumeData {
  return {
    name: '',
    mbaId: '',
    taglines: ['', '', ''],
    resumeType: 'unranked',
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    hiddenSections: [],
    sectionTitles: {},
    customSections: [],
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

/** The header to print for a section: the student's rename if they made one,
    the official title otherwise, and the custom section's own label for a
    section they added. */
export function sectionLabel(data: SupersetResumeData, key: SectionKey): string {
  if (isCustomKey(key)) {
    const custom = data.customSections?.find((c) => c.key === key);
    return custom?.label?.trim() || UNTITLED_SECTION;
  }
  return data.sectionTitles?.[key]?.trim() || SECTION_LABELS[key];
}
