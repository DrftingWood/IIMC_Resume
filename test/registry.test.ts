import { describe, it, expect } from 'vitest';
import { TEMPLATES, getTemplate, isTemplateKey } from '@/templates/registry';

describe('template registry', () => {
  it('registers only batch templates', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual(['superset']);
  });

  it('does not resolve devcv', () => {
    expect(getTemplate('devcv')).toBeUndefined();
    expect(isTemplateKey('devcv')).toBe(false);
  });
});
