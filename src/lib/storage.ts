import type { ResumeData, SectionKey } from '@/types/resume';
import { DEFAULT_SECTION_ORDER } from '@/types/resume';

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
    if (!Array.isArray(parsed.sectionOrder) || parsed.sectionOrder.length === 0) {
      parsed.sectionOrder = [...DEFAULT_SECTION_ORDER];
    } else {
      // Repair: drop unknown keys, append any missing defaults so all 5 are present.
      const seen = new Set<SectionKey>();
      const cleaned: SectionKey[] = [];
      for (const k of parsed.sectionOrder) {
        if (DEFAULT_SECTION_ORDER.includes(k) && !seen.has(k)) {
          cleaned.push(k);
          seen.add(k);
        }
      }
      for (const k of DEFAULT_SECTION_ORDER) {
        if (!seen.has(k)) cleaned.push(k);
      }
      parsed.sectionOrder = cleaned;
    }
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
