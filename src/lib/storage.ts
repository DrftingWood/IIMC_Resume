import type { ResumeData } from '@/types/resume';

const KEY = 'iimc-resume-builder:draft:v1';

export function saveDraft(data: ResumeData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('saveDraft failed', e);
  }
}

export function loadDraft(): ResumeData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeData;
    if (!parsed.resumeType) parsed.resumeType = 'unranked';
    return parsed;
  } catch (e) {
    console.warn('loadDraft failed', e);
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    console.warn('clearDraft failed', e);
  }
}
