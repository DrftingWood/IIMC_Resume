import type { AnyTemplateConfig, TemplateKey } from './types';
import { supersetTemplate } from './superset';
// devcv/ is kept on disk but intentionally unregistered — re-add it to
// TEMPLATES to bring the multi-template gallery back.

export const TEMPLATES: AnyTemplateConfig[] = [supersetTemplate];

export function getTemplate(id: TemplateKey | string): AnyTemplateConfig | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function isTemplateKey(id: string): id is TemplateKey {
  return TEMPLATES.some((t) => t.id === id);
}
