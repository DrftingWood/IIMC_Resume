/**
 * Page density. "official" reproduces the IIMC template's row pitch exactly
 * (14.6pt in Skynet), which fits about 37 points on one page (median across
 * 450 real resumes; 41 at most). The compact settings tighten only the row
 * pitch - fonts, column widths and margins are untouched - so about 40 or 45
 * points fit, like an IIM Ahmedabad CV. They are NOT the official format and
 * the UI says so.
 */
export type Density = 'official' | 'compact40' | 'compact45';

export const DENSITIES: { value: Density; label: string; points: string }[] = [
  { value: 'official', label: 'Official', points: 'about 37 points' },
  { value: 'compact40', label: 'Compact', points: 'about 40 points' },
  { value: 'compact45', label: 'Tightest', points: 'about 45 points' },
];

export function isDensity(v: unknown): v is Density {
  return v === 'official' || v === 'compact40' || v === 'compact45';
}

/** Extra class for the page root; none for the official layout. */
export function densityClass(d: Density | undefined): string {
  return d && d !== 'official' ? ` density-${d}` : '';
}
