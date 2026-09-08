// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadDraft, getLastTemplateId } from '@/lib/storage';

describe('draft migration', () => {
  beforeEach(() => localStorage.clear());

  it('folds a pre-rename iimc draft into the superset slot', () => {
    localStorage.setItem('iimc-resume-builder:draft:iimc:v1', JSON.stringify({ name: 'X' }));
    expect(loadDraft<{ name: string }>('superset')).toEqual({ name: 'X' });
    expect(localStorage.getItem('iimc-resume-builder:draft:iimc:v1')).toBeNull();
  });

  it('rewrites a stored lastTemplateId of iimc to superset', () => {
    localStorage.setItem('iimc-resume-builder:draft:iimc:v1', JSON.stringify({ name: 'X' }));
    localStorage.setItem('iimc-resume-builder:lastTemplateId', 'iimc');
    expect(getLastTemplateId()).toBe('superset');
  });
});
