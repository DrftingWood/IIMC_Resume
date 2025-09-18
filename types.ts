export type Education = {
  degree: string;
  university: string;
  year: string;
  gpa?: string;
  description?: string;
};

export type Experience = {
  title: string;
  company: string;
  duration: string;
  description?: string;
};

export type ResumeData = {
  education: Education[];
  experience: Experience[];
};

export const STORAGE_KEY = "resume_data_v1";
