import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SECTION_ORDER,
  SECTION_LABELS,
  emptySkynetResume,
} from '@/templates/skynet/types';
import { hydrateSkynet } from '@/templates/skynet/hydrate';

describe('skynet types', () => {
  it('has all seven sections in document order', () => {
    expect(DEFAULT_SECTION_ORDER).toEqual([
      'education', 'distinctions', 'projects', 'entrepreneurial',
      'industry', 'positions', 'extras',
    ]);
  });

  it('labels sections with the exact PDF header strings', () => {
    expect(SECTION_LABELS.education).toBe('Academic Profile');
    expect(SECTION_LABELS.positions).toBe('Position of Responsibility');
    expect(SECTION_LABELS.projects).toBe('Projects and Papers');
    expect(SECTION_LABELS.entrepreneurial).toBe('Entrepreneurial/Non-Profit Venture');
  });

  it('starts with the optional sections switched off and no ranked variant', () => {
    const empty = emptySkynetResume();
    // A blank resume should not open as seven empty section bars. These three
    // are the ones the corpus shows are optional; all seven remain listed in
    // the Sections panel, so this is a default rather than a restriction.
    expect(empty.hiddenSections).toEqual(['projects', 'entrepreneurial', 'positions']);
    expect(empty).not.toHaveProperty('resumeType');
  });

  it('repairs a draft missing the new fields', () => {
    const hydrated = hydrateSkynet({ name: 'X' } as never);
    expect(hydrated.projects).toEqual([]);
    expect(hydrated.entrepreneurial).toEqual([]);
    // A draft with no hiddenSections field predates it. Hidden is derived from
    // emptiness so a section that already has content is never hidden.
    expect(hydrated.hiddenSections).toEqual([
      'education', 'distinctions', 'projects', 'entrepreneurial',
      'industry', 'positions', 'extras',
    ]);
    expect(hydrated.sectionOrder).toEqual(DEFAULT_SECTION_ORDER);
  });

  it('drops unknown keys and appends missing ones in sectionOrder', () => {
    const hydrated = hydrateSkynet({ sectionOrder: ['extras', 'bogus'] } as never);
    expect(hydrated.sectionOrder[0]).toBe('extras');
    expect(hydrated.sectionOrder).toHaveLength(7);
    expect(hydrated.sectionOrder).not.toContain('bogus');
  });

  it('repairs corrupted (non-array) section fields instead of crashing the Preview', () => {
    // Simulates a hand-edited or partially-corrupted localStorage draft
    // where a section field holds the wrong type entirely, not just a
    // missing key.
    const hydrated = hydrateSkynet({
      distinctions: 'oops',
      projects: 42,
      entrepreneurial: {},
      extras: null,
      education: 'nope',
      experience: undefined,
      positions: 'bogus',
    } as never);
    expect(hydrated.distinctions).toEqual([]);
    expect(hydrated.projects).toEqual([]);
    expect(hydrated.entrepreneurial).toEqual([]);
    expect(hydrated.extras).toEqual([]);
    expect(hydrated.education).toEqual([]);
    expect(hydrated.experience).toEqual([]);
    expect(hydrated.positions).toEqual([]);
  });
});

describe('hydrate never hides a section that has content', () => {
  it('keeps a legacy draft\'s populated sections visible', async () => {
    const { hydrateSkynet } = await import('@/templates/skynet/hydrate');
    // Saved before hiddenSections existed, with real Projects content.
    const legacy = {
      name: 'X',
      projects: [{ category: 'Capstone', bullets: [{ text: 'Did a thing', year: '2025' }] }],
    } as never;
    const hydrated = hydrateSkynet(legacy);
    expect(hydrated.hiddenSections).not.toContain('projects');
    expect(hydrated.projects).toHaveLength(1);
  });
});
