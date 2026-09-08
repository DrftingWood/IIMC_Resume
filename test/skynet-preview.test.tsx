import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Preview from '@/templates/skynet/Preview';
import { SAMPLE } from '@/templates/skynet/sample';

describe('skynet preview', () => {
  it('renders every section heading in order', () => {
    render(<Preview data={SAMPLE} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      'ACADEMIC PROFILE',
      'ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS',
      'PROJECTS AND PAPERS',
      'ENTREPRENEURIAL/NON-PROFIT VENTURE',
      'INDUSTRY EXPERIENCE',
      'POSITION OF RESPONSIBILITY',
      'EXTRA-CURRICULAR ACHIEVEMENTS',
    ]);
  });

  it('omits hidden sections', () => {
    render(<Preview data={{ ...SAMPLE, hiddenSections: ['projects', 'positions'] }} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).not.toContain('PROJECTS AND PAPERS');
    expect(headings).not.toContain('POSITION OF RESPONSIBILITY');
    expect(headings).toContain('INDUSTRY EXPERIENCE');
  });

  it('honours a reordered sectionOrder', () => {
    const data = { ...SAMPLE, sectionOrder: ['extras', ...SAMPLE.sectionOrder.filter((k) => k !== 'extras')] as typeof SAMPLE.sectionOrder };
    render(<Preview data={data} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings[0]).toBe('EXTRA-CURRICULAR ACHIEVEMENTS');
  });

  it('renders the months banner beside the industry heading', () => {
    render(<Preview data={SAMPLE} />);
    expect(screen.getByText(SAMPLE.industryRightText)).toBeTruthy();
  });
});
