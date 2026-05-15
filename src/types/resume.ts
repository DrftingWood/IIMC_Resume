export interface ResumeData {
  name: string;
  mbaId: string;
  taglines: [string, string, string];
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

export function emptyResume(): ResumeData {
  return {
    name: '',
    mbaId: '',
    taglines: ['', '', ''],
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
