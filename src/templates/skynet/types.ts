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

export interface SkynetResumeData {
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
  degree: string;
  institute: string;
  gpa: string;
  rank?: string;
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

export function emptySkynetResume(): SkynetResumeData {
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
