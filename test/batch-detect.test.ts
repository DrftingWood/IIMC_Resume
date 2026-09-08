import { describe, it, expect } from 'vitest';
import { loadFixture } from './support/pdf';
import { batchNumberFromLines, templateForBatch } from '@/lib/batch';
import { detectSkynet } from '@/templates/skynet/detect';
import { detectSuperset } from '@/templates/superset/detect';

describe('batch detection', () => {
  it('reads the batch number from the MBA id', () => {
    expect(batchNumberFromLines(loadFixture('skynet-a'))).toBe(63);
    expect(batchNumberFromLines(loadFixture('superset-a'))).toBe(61);
  });

  it('maps batch numbers to templates at the 62 boundary', () => {
    expect(templateForBatch(61)).toBe('superset');
    expect(templateForBatch(62)).toBe('skynet');
    expect(templateForBatch(63)).toBe('skynet');
    expect(templateForBatch(58)).toBe('superset');
  });

  it('returns null when no MBA id is present', () => {
    expect(batchNumberFromLines([])).toBeNull();
  });

  it('detectors agree with the id, and never both claim a file', () => {
    for (const [f, expected] of [['skynet-a', true], ['superset-a', false]] as const) {
      expect(detectSkynet(loadFixture(f))).toBe(expected);
      expect(detectSuperset(loadFixture(f))).toBe(!expected);
    }
  });
});
