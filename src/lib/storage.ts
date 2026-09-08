import type { TemplateKey } from '@/templates/types';
import { isTemplateKey } from '@/templates/registry';

const OLD_DRAFT_KEY = 'iimc-resume-builder:draft:v1';
const IIMC_DRAFT_KEY = 'iimc-resume-builder:draft:iimc:v1';
const LAST_TEMPLATE_KEY = 'iimc-resume-builder:lastTemplateId';

function draftKey(templateId: TemplateKey): string {
  return `iimc-resume-builder:draft:${templateId}:v1`;
}

/** Run once on app boot: fold pre-multi-template and pre-rename drafts into `superset`. */
function migrateLegacyDraft(): void {
  try {
    const target = draftKey('superset');
    // Newest-first: IIMC_DRAFT_KEY (post-multi-template, pre-rename) is more recent than
    // OLD_DRAFT_KEY (pre-multi-template). If both exist, the first one processed wins the
    // target slot — so IIMC_DRAFT_KEY must come first, or a user's newer draft gets silently
    // discarded in favour of a stale one. Both keys are still removed either way.
    for (const legacy of [IIMC_DRAFT_KEY, OLD_DRAFT_KEY]) {
      const old = localStorage.getItem(legacy);
      if (!old) continue;
      if (!localStorage.getItem(target)) localStorage.setItem(target, old);
      localStorage.removeItem(legacy);
    }
    if (localStorage.getItem(LAST_TEMPLATE_KEY) === 'iimc') {
      localStorage.setItem(LAST_TEMPLATE_KEY, 'superset');
    }
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
  try {
    if (localStorage.getItem(draftKey('superset'))) return 'superset';
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
