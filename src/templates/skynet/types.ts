import type { CustomSectionKey } from '@/lib/customSections';
import { isCustomKey, UNTITLED_SECTION } from '@/lib/customSections';

/** The seven sections the 62nd-batch format defines. Closed, so the parser's
    switches stay exhaustive and `detect` can only ever produce one of these. */
export type BuiltInSectionKey =
  | 'education'
  | 'distinctions'
  | 'projects'
  | 'entrepreneurial'
  | 'industry'
  | 'positions'
  | 'extras';

/** A built-in section, or one the student added. */
export type SectionKey = BuiltInSectionKey | CustomSectionKey;

export const DEFAULT_SECTION_ORDER: BuiltInSectionKey[] = [
  'education',
  'distinctions',
  'projects',
  'entrepreneurial',
  'industry',
  'positions',
  'extras',
];

export const SECTION_LABELS: Record<BuiltInSectionKey, string> = {
  education: 'Academic Profile',
  distinctions: 'Academic Distinctions & Co-Curricular Achievements',
  projects: 'Projects and Papers',
  entrepreneurial: 'Entrepreneurial/Non-Profit Venture',
  industry: 'Industry Experience',
  positions: 'Position of Responsibility',
  extras: 'Extra-Curricular Achievements',
};

/** A section the student added. Its content is a bullet table, the shape five
    of the seven built-in sections already use. */
export interface CustomSection {
  key: CustomSectionKey;
  label: string;
  groups: BulletGroup[];
}

export interface SkynetResumeData {
  name: string;
  mbaId: string;
  taglines: [string, string, string];
  sectionOrder: SectionKey[];
  hiddenSections: SectionKey[];
  /** Renamed built-in headers. Absent key = the official title in
      SECTION_LABELS, which is what Reset restores. */
  sectionTitles: Partial<Record<BuiltInSectionKey, string>>;
  customSections: CustomSection[];
  education: EducationRow[];
  distinctions: BulletGroup[];
  projects: BulletGroup[];
  entrepreneurial: BulletGroup[];
  industryRightText: string;
  experience: ExperienceEntry[];
  positions: PositionEntry[];
  extras: BulletGroup[];
  email: string;
  institute: string;
}

export function emptySkynetResume(): SkynetResumeData {
  return {
    name: '',
    mbaId: '',
    taglines: ['', '', ''],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    /* A blank resume starts with the optional sections switched off, so it does
       not open as seven empty section bars that would print as empty bars.
       These are the three that are genuinely optional: Position of
       Responsibility, Projects and Entrepreneurial are often absent. All seven stay listed in the Sections panel with
       their checkboxes, so nothing is hidden from view - it is a default, not
       a restriction. */
    hiddenSections: ['projects', 'entrepreneurial', 'positions'],
    sectionTitles: {},
    customSections: [],
    education: [],
    distinctions: [],
    projects: [],
    entrepreneurial: [],
    industryRightText: '',
    experience: [],
    positions: [],
    extras: [],
    email: '',
    institute: 'Indian Institute of Management Calcutta',
  };
}

export interface EducationRow {
  degree: string;
  institute: string;
  gpa: string;
  year: string;
}

export interface YearedBullet {
  text: string;
  year: string;
}

export interface BulletGroup {
  category: string;
  bullets: YearedBullet[];
}

export interface ExperienceSubSection {
  label: string;
  bullets: string[];
}

export interface ExperienceEntry {
  type: string;
  firm: string;
  role: string;
  dates: string;
  subSections: ExperienceSubSection[];
}

export interface PositionEntry {
  title: string;
  bullets: string[];
  year: string;
}

/** The header to print for a section: the student's rename if they made one,
    the official title otherwise, and the custom section's own label for a
    section they added. */
export function sectionLabel(data: SkynetResumeData, key: SectionKey): string {
  if (isCustomKey(key)) {
    const custom = data.customSections?.find((c) => c.key === key);
    return custom?.label?.trim() || UNTITLED_SECTION;
  }
  return data.sectionTitles?.[key]?.trim() || SECTION_LABELS[key];
}
