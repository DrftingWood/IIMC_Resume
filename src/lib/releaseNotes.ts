/**
 * The "What's new" panel on the landing page. To announce a release, replace
 * RELEASE with a new id, date and list; a new id shows again even to students
 * who dismissed the last one.
 */

export interface ReleaseNote {
  /** Short, scannable title. */
  title: string;
  /** One sentence on what it means for the student. */
  detail: string;
  kind: 'New' | 'Improved' | 'Fixed';
}

export interface Release {
  id: string;
  /** Release moment; the panel shows for SHOW_DAYS from here. */
  date: string;
  notes: ReleaseNote[];
}

export const SHOW_DAYS = 3;

export const RELEASE: Release = {
  // A new id shows the panel again, even to students who closed the last one.
  id: '2026-10-20b',
  date: '2026-10-20T12:00:00+05:30',
  notes: [
    {
      kind: 'Improved',
      title: 'Matches the official PDF',
      detail:
        'Row heights, line widths, colours, rules, taglines and footer were measured against real IIMC resumes, so the preview and export now line up with the original.',
    },
    {
      kind: 'Fixed',
      title: 'Bold comes through on upload',
      detail:
        'Bold is read from your PDF, including resumes where most of a point is bold, which used to come in reversed.',
    },
    {
      kind: 'New',
      title: 'Hide points without deleting them',
      detail:
        'Use the eye button on any point or whole entry to keep it in your bank but leave it off the page.',
    },
    {
      kind: 'New',
      title: 'Line-fill meter',
      detail:
        'Next to every point: how many characters still fit on its line, or how many to cut when it runs onto two.',
    },
    {
      kind: 'New',
      title: 'Compact layouts for about 40 or 45 points',
      detail:
        'Optional, under Page density in the Sections panel. Tighter rows fit more points; it is not the official layout.',
    },
    {
      kind: 'Improved',
      title: 'Your own sections now print',
      detail:
        'Sections added in the Sections panel appear on the resume and in the editor, and renamed sections print their new title.',
    },
    {
      kind: 'Improved',
      title: 'Points sit as they do in the official template',
      detail:
        'Points are left-aligned instead of stretched, so you can see their true length.',
    },
    {
      kind: 'Improved',
      title: 'Clearer controls',
      detail:
        'Start over and Restore defaults replace two look-alike Reset buttons, the full page is visible on laptop screens, and switching format asks first.',
    },
    {
      kind: 'Fixed',
      title: 'Uploaded resumes keep every word and year',
      detail:
        'A number near the right edge no longer cuts off the end of points or drops their years on import.',
    },
  ],
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function isReleaseFresh(release: Release, now: number): boolean {
  const start = Date.parse(release.date);
  return Number.isFinite(start) && now >= start && now < start + SHOW_DAYS * DAY_MS;
}

export const dismissKey = (release: Release) =>
  `iimc-resume-builder:whats-new-dismissed:${release.id}`;
