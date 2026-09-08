import { describe, it, expect } from 'vitest';
import { loadFixture } from './support/pdf';
import { parseResume } from '@/templates/iimc/parser';

describe('superset parser (frozen)', () => {
  it('parses the 61st-batch fixture without failed sections', () => {
    const result = parseResume(loadFixture('superset-a'));
    expect(result.failedSections).toEqual([]);
    expect(result.data.mbaId).toBe('MBA/9004/61');
    expect(result.data.education!.length).toBeGreaterThanOrEqual(3);
    expect(result.data.distinctions!.length).toBeGreaterThan(0);
    expect(result.data.extras!.length).toBeGreaterThan(0);
  });

  it('matches its golden snapshot', () => {
    expect(parseResume(loadFixture('superset-a'))).toMatchSnapshot();
  });
});
