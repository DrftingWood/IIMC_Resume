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
    return JSON.parse(raw) as ResumeData;
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
