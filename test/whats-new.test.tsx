import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { WhatsNew } from '@/components/WhatsNew';
import { RELEASE, SHOW_DAYS, dismissKey, isReleaseFresh } from '@/lib/releaseNotes';

const start = Date.parse(RELEASE.date);
const HOUR = 60 * 60 * 1000;

describe("what's new panel", () => {
  beforeEach(() => localStorage.clear());

  it('lists every update as a numbered list', () => {
    render(<WhatsNew now={start + HOUR} />);
    const panel = screen.getByRole('region', { name: "What's new" });
    const list = within(panel).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(RELEASE.notes.length);
    expect(within(panel).getByText('Hide points without deleting them')).toBeTruthy();
  });

  it('sits in the page instead of covering it', () => {
    render(<WhatsNew now={start + HOUR} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region').className).not.toMatch(/\b(fixed|absolute)\b/);
  });

  it('closes, and stays closed on the next visit', () => {
    const { unmount } = render(<WhatsNew now={start + HOUR} />);
    fireEvent.click(screen.getByRole('button', { name: "Close what's new" }));
    expect(screen.queryByRole('region')).toBeNull();
    expect(localStorage.getItem(dismissKey(RELEASE))).toBe('1');
    unmount();
    render(<WhatsNew now={start + 2 * HOUR} />);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('shows for three days from the release, then retires itself', () => {
    expect(SHOW_DAYS).toBe(3);
    expect(isReleaseFresh(RELEASE, start - 1)).toBe(false);
    expect(isReleaseFresh(RELEASE, start)).toBe(true);
    expect(isReleaseFresh(RELEASE, start + 72 * HOUR - 1)).toBe(true);
    expect(isReleaseFresh(RELEASE, start + 72 * HOUR)).toBe(false);
    render(<WhatsNew now={start + 73 * HOUR} />);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('shows a new release even to someone who closed the last one', () => {
    localStorage.setItem(dismissKey(RELEASE), '1');
    const next = { ...RELEASE, id: 'next', date: new Date(start + 10 * 24 * HOUR).toISOString() };
    render(<WhatsNew release={next} now={start + 10 * 24 * HOUR + HOUR} />);
    expect(screen.getByRole('region', { name: "What's new" })).toBeTruthy();
  });
});
