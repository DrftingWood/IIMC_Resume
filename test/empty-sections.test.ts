import { describe, it, expect } from 'vitest';
import { emptyVisibleSections } from '@/lib/emptySections';
import { emptySkynetResume } from '@/templates/skynet/types';
import { SAMPLE } from '@/templates/skynet/sample';

describe('empty-section advisory', () => {
  it('stays quiet on a resume nobody has started yet', () => {
    // Everything is empty by definition here; warning about it is noise.
    expect(emptyVisibleSections('skynet', emptySkynetResume())).toEqual([]);
  });

  it('stays quiet when every visible section has content', () => {
    expect(emptyVisibleSections('skynet', SAMPLE)).toEqual([]);
  });

  it('names a section left switched on but blank', () => {
    // The case that actually costs marks: mostly filled, one empty bar left in.
    const data = { ...SAMPLE, extras: [], hiddenSections: [] };
    expect(emptyVisibleSections('skynet', data)).toContain('Extra-Curricular Achievements');
  });

  it('says nothing about a section that is switched off', () => {
    const data = { ...SAMPLE, extras: [], hiddenSections: ['extras'] };
    expect(emptyVisibleSections('skynet', data)).not.toContain('Extra-Curricular Achievements');
  });

  it('handles no template and no data', () => {
    expect(emptyVisibleSections(null, null)).toEqual([]);
  });
});
