import { describe, it, expect } from 'vitest';
import { hydrateSuperset } from '@/templates/superset/hydrate';

describe('superset hydrate — hiddenSections', () => {
  it('a stored draft with no hiddenSections at all yields []', () => {
    const hydrated = hydrateSuperset({ name: 'X' } as never);
    expect(hydrated.hiddenSections).toEqual([]);
  });

  it('drops a Skynet-only key (e.g. "projects") that Superset does not have', () => {
    const hydrated = hydrateSuperset({ hiddenSections: ['projects'] } as never);
    expect(hydrated.hiddenSections).toEqual([]);
  });

  it('hiddenSections present but not an array yields []', () => {
    const hydrated = hydrateSuperset({ hiddenSections: 'projects' } as never);
    expect(hydrated.hiddenSections).toEqual([]);
  });

  it('keeps a valid Superset section key', () => {
    const hydrated = hydrateSuperset({ hiddenSections: ['positions'] } as never);
    expect(hydrated.hiddenSections).toEqual(['positions']);
  });

  it('repairs corrupted (non-array) section fields instead of crashing the Preview', () => {
    // Simulates a hand-edited or partially-corrupted localStorage draft
    // where a section field holds the wrong type entirely, not just a
    // missing key. Mirrors the equivalent Skynet repair loop/test.
    const hydrated = hydrateSuperset({
      distinctions: 'oops',
      extras: 42,
      education: {},
      experience: null,
      positions: 'bogus',
    } as never);
    expect(hydrated.distinctions).toEqual([]);
    expect(hydrated.extras).toEqual([]);
    expect(hydrated.education).toEqual([]);
    expect(hydrated.experience).toEqual([]);
    expect(hydrated.positions).toEqual([]);
  });
});
