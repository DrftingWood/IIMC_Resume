/**
 * "34 Months (FULL-TIME)" in the Industry Experience bar, computed from the
 * firm banners' dates the way the official resumes count them: end month
 * minus start month (Jul'23-May'26 is 34). Measured on real resumes with a
 * single firm: 23 counted that way, 4 inclusively.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Month index (years * 12 + month) of "Aug'23", "Aug 2023", "August '23". */
function monthIndex(s: string): number | null {
  const m = s.trim().match(/^([A-Za-z]{3})[A-Za-z]*\.?\s*[`'’]?\s*(\d{4}|\d{2})$/);
  if (!m) return null;
  const mon = MONTHS.indexOf(m[1].toLowerCase());
  if (mon < 0) return null;
  const y = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  return y * 12 + mon;
}

/** [start, end) month indexes of a banner's dates, or null if unreadable. */
export function monthRange(dates: string, now: Date = new Date()): [number, number] | null {
  const parts = dates.split(/\s*(?:[-–—]|\bto\b)\s*/i).filter(Boolean);
  if (parts.length !== 2) return null;
  const start = monthIndex(parts[0]);
  const end = /^(present|current|now|till date|ongoing)$/i.test(parts[1].trim())
    ? now.getFullYear() * 12 + now.getMonth()
    : monthIndex(parts[1]);
  if (start === null || end === null || end < start) return null;
  return [start, end];
}

/**
 * Total months across the given banners' dates, overlapping spells counted
 * once. Null when any date is unreadable, so a wrong number is never shown.
 */
export function totalMonths(datesList: string[], now?: Date): number | null {
  const ranges: [number, number][] = [];
  for (const d of datesList) {
    const r = monthRange(d, now);
    if (!r) return null;
    ranges.push(r);
  }
  if (!ranges.length) return null;
  ranges.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [cs, ce] = ranges[0];
  for (const [s, e] of ranges.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else {
      total += ce - cs;
      [cs, ce] = [s, e];
    }
  }
  return total + (ce - cs);
}

/** "21 Months (FULL-TIME)" for these Full Time banners, or null. */
export function fullTimeLabel(datesList: string[], now?: Date): string | null {
  const n = totalMonths(datesList, now);
  return n === null || n <= 0 ? null : `${n} Months (FULL-TIME)`;
}
