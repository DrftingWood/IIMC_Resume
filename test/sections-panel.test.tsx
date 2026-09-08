import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkynetPanel from '@/templates/skynet/SectionsPanel';
import { SAMPLE } from '@/templates/skynet/sample';

describe('sections panel', () => {
  it('shows a checkbox per section, all checked when nothing is hidden', () => {
    render(<SkynetPanel data={SAMPLE} onChange={vi.fn()} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(7);
    for (const b of boxes) expect((b as HTMLInputElement).checked).toBe(true);
  });

  it('hides a section when its checkbox is unticked', async () => {
    const onChange = vi.fn();
    render(<SkynetPanel data={SAMPLE} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Projects and Papers/i }));
    expect(onChange).toHaveBeenCalledWith({ hiddenSections: ['projects'] });
  });

  it('unhides a section when its checkbox is reticked', async () => {
    const onChange = vi.fn();
    render(<SkynetPanel data={{ ...SAMPLE, hiddenSections: ['projects'] }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Projects and Papers/i }));
    expect(onChange).toHaveBeenCalledWith({ hiddenSections: [] });
  });

  it('still reorders sections', async () => {
    const onChange = vi.fn();
    render(<SkynetPanel data={SAMPLE} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Move Academic Distinctions.*up/i }));
    expect(onChange).toHaveBeenCalledWith({
      sectionOrder: ['distinctions', 'education', 'projects', 'entrepreneurial',
                     'industry', 'positions', 'extras'],
    });
  });
});
