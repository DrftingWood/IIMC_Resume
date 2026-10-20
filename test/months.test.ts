import { describe, it, expect } from 'vitest';
import { monthRange, totalMonths, fullTimeLabel } from '@/lib/months';

const now = new Date(2026, 9, 20); // Oct 2026

describe('full-time months', () => {
  it('counts end month minus start month, as the official resumes do', () => {
    expect(totalMonths(["Jul'23-May'26"], now)).toBe(34);
    expect(fullTimeLabel(["Aug'23-May'25"], now)).toBe('21 Months (FULL-TIME)');
  });

  it('reads the date styles students use', () => {
    expect(monthRange('Aug 2023 - May 2025', now)).not.toBeNull();
    expect(monthRange('August ’23 – May ’25', now)).not.toBeNull();
    expect(totalMonths(["Jun'25 - Present"], now)).toBe(16);
  });

  it('counts overlapping spells once and adds separate ones', () => {
    expect(totalMonths(["Jan'22-Dec'22", "Jun'22-Mar'23"], now)).toBe(14);
    expect(totalMonths(["Jan'22-Jul'22", "Jan'23-Jul'23"], now)).toBe(12);
  });

  it('shows nothing rather than a wrong number when a date is unreadable', () => {
    expect(fullTimeLabel(["Aug'23-May'25", 'Summer 2024'], now)).toBeNull();
  });
});
