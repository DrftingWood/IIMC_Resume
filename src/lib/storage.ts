import type { TemplateKey } from '@/templates/types';
import { isTemplateKey } from '@/templates/registry';

const OLD_DRAFT_KEY = 'iimc-resume-builder:draft:v1';
const LAST_TEMPLATE_KEY = 'iimc-resume-builder:lastTemplateId';

function draftKey(templateId: TemplateKey): string {
  return `iimc-resume-builder:draft:${templateId}:v1`;
}

/** Run once on app boot: copy a pre-multi-template draft into the iimc slot. */
function migrateLegacyDraft(): void {
  try {
    const old = localStorage.getItem(OLD_DRAFT_KEY);
    if (!old) return;
    const newKey = draftKey('iimc');
    if (!localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, old);
    }
    localStorage.removeItem(OLD_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function saveDraft(templateId: TemplateKey, data: unknown): void {
  try {
    localStorage.setItem(draftKey(templateId), JSON.stringify(data));
  } catch (e) {
    console.warn('saveDraft failed', e);
  }
}

export function loadDraft<T>(templateId: TemplateKey): T | null {
  migrateLegacyDraft();
  try {
    const raw = localStorage.getItem(draftKey(templateId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn('loadDraft failed', e);
    return null;
  }
}

export function clearDraft(templateId: TemplateKey): void {
  try {
    localStorage.removeItem(draftKey(templateId));
  } catch (e) {
    console.warn('clearDraft failed', e);
  }
}

export function getLastTemplateId(): TemplateKey | null {
  migrateLegacyDraft();
  try {
    const raw = localStorage.getItem(LAST_TEMPLATE_KEY);
    if (raw && isTemplateKey(raw)) return raw;
  } catch {
    /* ignore */
  }
  // If a legacy draft existed, lastTemplateId defaults to iimc.
  try {
    if (localStorage.getItem(draftKey('iimc'))) return 'iimc';
  } catch {
    /* ignore */
  }
  return null;
}

export function setLastTemplateId(templateId: TemplateKey): void {
  try {
    localStorage.setItem(LAST_TEMPLATE_KEY, templateId);
  } catch {
    /* ignore */
  }
}
