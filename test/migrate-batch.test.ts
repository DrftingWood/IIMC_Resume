import { describe, it, expect } from 'vitest';
import { migrateBetweenBatches, SHARED_KEYS } from '@/lib/migrateBatch';
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
    // Iterate the REAL SHARED_KEYS from production (not a hand-copied list)
    // so this test fails automatically if a shared key is ever added to
    // migrateBatch.ts without being carried, or dropped without being
    // caught here. `sectionOrder` and `hiddenSections` are excluded from
    // the strict-equality loop below and checked separately: hydrateSkynet
    // legitimately appends Skynet-only sections to sectionOrder, and
    // migrateBetweenBatches legitimately adds `projects`/`entrepreneurial`
    // to hiddenSections when they come back empty (F6) — neither is a loss.
    const dataRec = data as unknown as Record<string, unknown>;
    const supersetRec = SUPERSET as unknown as Record<string, unknown>;
    for (const k of SHARED_KEYS) {
      if (k === 'sectionOrder' || k === 'hiddenSections') continue;
      expect(dataRec[k]).toEqual(supersetRec[k]);
    }
    // sectionOrder is carried as a prefix; Skynet-only sections are appended by hydrateSkynet.
    expect(data.sectionOrder.slice(0, SUPERSET.sectionOrder.length)).toEqual(SUPERSET.sectionOrder);
    // hiddenSections: nothing from Superset's own (empty) hiddenSections is lost,
    // but the two Skynet-only sections are auto-hidden since they came back empty.
    expect(data.hiddenSections).toEqual(['projects', 'entrepreneurial']);
  });

  it('hides projects/entrepreneurial when they come back empty on a skynet -> superset -> skynet round trip', () => {
    const { data: toSuperset } = migrateBetweenBatches('skynet', 'superset', SKYNET) as never as
      { data: typeof SUPERSET };
    const { data: backToSkynet } = migrateBetweenBatches('superset', 'skynet', toSuperset) as never as
      { data: typeof SKYNET };
    expect(backToSkynet.projects).toEqual([]);
    expect(backToSkynet.entrepreneurial).toEqual([]);
    expect(backToSkynet.hiddenSections).toContain('projects');
    expect(backToSkynet.hiddenSections).toContain('entrepreneurial');
  });

  it('round-trips resumeType: ranked superset -> skynet -> superset keeps ranked', () => {
    const ranked = { ...SUPERSET, resumeType: 'ranked' as const };
    const { data: toSkynet } = migrateBetweenBatches('superset', 'skynet', ranked) as never as
      { data: typeof SKYNET };
    const { data: backToSuperset } = migrateBetweenBatches('skynet', 'superset', toSkynet) as never as
      { data: typeof SUPERSET };
    expect(backToSuperset.resumeType).toBe('ranked');
  });

  it('carries a reordered sectionOrder from skynet to superset', () => {
    const reordered = { ...SKYNET, sectionOrder: ['extras', 'education', 'distinctions', 'projects', 'entrepreneurial', 'industry', 'positions'] };
    const { data } = migrateBetweenBatches('skynet', 'superset', reordered) as never as
      { data: typeof SUPERSET };
    expect(data.sectionOrder[0]).toBe('extras');
  });
});
