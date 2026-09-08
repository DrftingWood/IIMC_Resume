import type { AnyTemplateConfig, TemplateKey } from './types';
import { supersetTemplate } from './superset';
import { devcvTemplate } from './devcv';

export const TEMPLATES: AnyTemplateConfig[] = [supersetTemplate, devcvTemplate];

export function getTemplate(id: TemplateKey | string): AnyTemplateConfig | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function isTemplateKey(id: string): id is TemplateKey {
  return TEMPLATES.some((t) => t.id === id);
}
