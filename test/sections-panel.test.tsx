import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkynetPanel from '@/templates/skynet/SectionsPanel';
import Preview from '@/templates/skynet/Preview';
import { SAMPLE } from '@/templates/skynet/sample';
import type { SkynetResumeData } from '@/templates/skynet/types';

// Mirrors src/App.tsx's `update` handler exactly:
//   setData((prev) => (prev ? { ...(prev as object), ...patch } : prev));
// so this test exercises the real merge semantics, not a reimplementation.
function applyPatchLikeApp(
  prev: SkynetResumeData,
  patch: Partial<SkynetResumeData>
): SkynetResumeData {
  return { ...prev, ...patch };
}

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

  it('hiding a section never deletes its data — round trip through the real merge', async () => {
    expect(SAMPLE.projects.length).toBeGreaterThan(0);
    const originalProjects = SAMPLE.projects;

    // 1. Capture the patch the panel actually emits when Projects is unticked.
    let latestPatch: Partial<SkynetResumeData> | null = null;
    const onChange = vi.fn((p: Partial<SkynetResumeData>) => { latestPatch = p; });
    const { unmount: unmountPanel1 } = render(<SkynetPanel data={SAMPLE} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Projects and Papers/i }));
    unmountPanel1();
    expect(latestPatch).toEqual({ hiddenSections: ['projects'] });

    // 2. Merge it the same way App.tsx's `update` does — a shallow spread.
    const afterHide = applyPatchLikeApp(SAMPLE, latestPatch!);

    // 3. The data must survive untouched — only the hidden-list key changed.
    expect(afterHide.projects).toEqual(originalProjects);
    expect(afterHide.projects).toBe(originalProjects); // same reference: nothing rebuilt or cleared

    // 4. Render the Preview with the merged data: the heading must be gone.
    const { unmount: unmountPreview1 } = render(<Preview data={afterHide} />);
    let headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).not.toContain('PROJECTS AND PAPERS');
    unmountPreview1();

    // 5. Unhide via the panel again, merge again, and confirm the section is
    // back with its original bullets intact.
    let unhidePatch: Partial<SkynetResumeData> | null = null;
    const onChange2 = vi.fn((p: Partial<SkynetResumeData>) => { unhidePatch = p; });
    const { unmount: unmountPanel2 } = render(<SkynetPanel data={afterHide} onChange={onChange2} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Projects and Papers/i }));
    unmountPanel2();
    expect(unhidePatch).toEqual({ hiddenSections: [] });

    const afterUnhide = applyPatchLikeApp(afterHide, unhidePatch!);
    expect(afterUnhide.projects).toEqual(originalProjects);

    render(<Preview data={afterUnhide} />);
    headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toContain('PROJECTS AND PAPERS');
    // Bullets render (bold markup is split across <strong> nodes, so match on
    // the un-bolded category labels, which render as single whole text nodes).
    for (const group of originalProjects) {
      const firstLine = group.category.split('\n')[0];
      expect(screen.getByText(firstLine)).toBeTruthy();
    }
  });
});
