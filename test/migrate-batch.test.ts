import { describe, it, expect } from 'vitest';
import { migrateBetweenBatches } from '@/lib/migrateBatch';
import { SAMPLE as SKYNET } from '@/templates/skynet/sample';
import { SAMPLE as SUPERSET } from '@/templates/superset/sample';

describe('cross-batch carry-over', () => {
  it('carries the shared sections from skynet to superset', () => {
    const { data } = migrateBetweenBatches('skynet', 'superset', SKYNET) as never as
      { data: typeof SUPERSET };
    expect(data.name).toBe(SKYNET.name);
    expect(data.mbaId).toBe(SKYNET.mbaId);
    expect(data.taglines).toEqual(SKYNET.taglines);
    expect(data.education).toEqual(SKYNET.education);
    expect(data.distinctions).toEqual(SKYNET.distinctions);
    expect(data.extras).toEqual(SKYNET.extras);
    expect(data.resumeType).toBe('unranked');
  });

  it('reports the sections dropped going skynet -> superset', () => {
    const { dropped } = migrateBetweenBatches('skynet', 'superset', SKYNET);
    expect(dropped).toEqual(['Projects and Papers', 'Entrepreneurial/Non-Profit Venture']);
  });

  it('reports nothing dropped when those sections are empty', () => {
    const bare = { ...SKYNET, projects: [], entrepreneurial: [] };
    expect(migrateBetweenBatches('skynet', 'superset', bare).dropped).toEqual([]);
  });

  it('is lossless going superset -> skynet', () => {
    const { data, dropped } = migrateBetweenBatches('superset', 'skynet', SUPERSET) as never as
      { data: typeof SKYNET; dropped: string[] };
    expect(dropped).toEqual([]);
    expect(data.projects).toEqual([]);
    expect(data.entrepreneurial).toEqual([]);
    const SHARED_KEYS = [
      'name', 'mbaId', 'taglines', 'education', 'distinctions',
      'experience', 'industryRightText', 'positions', 'extras', 'email', 'institute',
    ] as const;
    for (const k of SHARED_KEYS) {
      expect(data[k]).toEqual(SUPERSET[k]);
    }
    // sectionOrder is carried as a prefix; Skynet-only sections are appended by hydrateSkynet.
    expect(data.sectionOrder.slice(0, SUPERSET.sectionOrder.length)).toEqual(SUPERSET.sectionOrder);
  });

  it('carries a reordered sectionOrder from skynet to superset', () => {
    const reordered = { ...SKYNET, sectionOrder: ['extras', 'education', 'distinctions', 'projects', 'entrepreneurial', 'industry', 'positions'] };
    const { data } = migrateBetweenBatches('skynet', 'superset', reordered) as never as
      { data: typeof SUPERSET };
    expect(data.sectionOrder[0]).toBe('extras');
  });
});
