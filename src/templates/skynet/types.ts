export type SectionKey =
  | 'education'
  | 'distinctions'
  | 'projects'
  | 'entrepreneurial'
  | 'industry'
  | 'positions'
  | 'extras';

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'education',
  'distinctions',
  'projects',
  'entrepreneurial',
  'industry',
  'positions',
  'extras',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  education: 'Academic Profile',
  distinctions: 'Academic Distinctions & Co-Curricular Achievements',
  projects: 'Projects and Papers',
  entrepreneurial: 'Entrepreneurial/Non-Profit Venture',
  industry: 'Industry Experience',
  positions: 'Position of Responsibility',
  extras: 'Extra-Curricular Achievements',
};

export interface SkynetResumeData {
  name: string;
  mbaId: string;
  taglines: [string, string, string];
  sectionOrder: SectionKey[];
  hiddenSections: SectionKey[];
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
    hiddenSections: [],
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
