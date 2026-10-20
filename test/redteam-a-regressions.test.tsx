import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { migrateBetweenBatches } from '@/lib/migrateBatch';
import { withoutHidden } from '@/lib/visibility';
import { emptyVisibleSections } from '@/lib/emptySections';
import { hydrateSkynet } from '@/templates/skynet/hydrate';
import SkynetSectionsPanel from '@/templates/skynet/SectionsPanel';
import SkynetPreview from '@/templates/skynet/Preview';
import { SAMPLE } from '@/templates/skynet/sample';
import type { SkynetResumeData } from '@/templates/skynet/types';

const certs = {
  key: 'custom:1' as const,
  label: 'Certifications',
  groups: [{ category: 'Finance', bullets: [{ text: 'CFA Level II', year: '2025' }] }],
};

function withCustom(): SkynetResumeData {
  return {
    ...SAMPLE,
    customSections: [certs],
    sectionOrder: [...SAMPLE.sectionOrder, 'custom:1'],
    sectionTitles: { positions: 'Leadership', projects: 'Research' },
    density: 'compact45',
  };
}

describe('switching batch format keeps the student’s work', () => {
  it('carries custom sections, renamed titles and density there and back', () => {
    const toSuperset = migrateBetweenBatches('skynet', 'superset', withCustom()).data as Record<string, unknown>;
    expect(toSuperset.customSections).toEqual([certs]);
    expect(toSuperset.sectionOrder).toContain('custom:1');
    expect(toSuperset.sectionTitles).toEqual({ positions: 'Leadership' });
    expect(toSuperset.density).toBe('compact45');

    const back = migrateBetweenBatches('superset', 'skynet', toSuperset).data as SkynetResumeData;
    expect(back.customSections).toEqual([certs]);
    expect(back.sectionOrder).toContain('custom:1');
    expect(back.sectionTitles.positions).toBe('Leadership');
    expect(back.density).toBe('compact45');
  });
});

describe('hidden work-ex', () => {
  it('drops a firm whose every point is hidden instead of printing a bare banner', () => {
    const data = { ...SAMPLE, experience: SAMPLE.experience.map((e) => ({ ...e })) };
    const firm = data.experience[0];
    firm.subSections = firm.subSections.map((s) => ({ ...s, hiddenBullets: s.bullets.map(() => true) }));
    const out = withoutHidden(data);
    expect(out.experience.map((e) => e.firm)).not.toContain(firm.firm);
    expect(out.experience).toHaveLength(SAMPLE.experience.length - 1);
  });
});

describe('empty-section warning', () => {
  it('covers custom sections, by their own name', () => {
    const data = withCustom();
    data.customSections = [{ ...certs, groups: [{ ...certs.groups[0], hidden: true }] }];
    expect(emptyVisibleSections('skynet', data)).toContain('Certifications');
    data.customSections = [{ ...certs, groups: [] }];
    expect(emptyVisibleSections('skynet', data)).toContain('Certifications');
    expect(emptyVisibleSections('skynet', withCustom())).not.toContain('Certifications');
  });

  it('names a renamed section the way the page prints it', () => {
    const data = { ...withCustom(), positions: [] };
    expect(emptyVisibleSections('skynet', data)).toContain('Leadership');
  });

  it('uses the 61st-batch titles for that format', () => {
    const data = { ...withCustom(), sectionTitles: {}, education: [] };
    expect(emptyVisibleSections('superset', data)).toContain('Academic Qualifications');
  });
});

describe('renaming a section', () => {
  it('lets the box be cleared and drops a title set back to the official one', () => {
    const onChange = vi.fn();
    const data = { ...SAMPLE, sectionTitles: { positions: 'Leadership' } };
    const { rerender } = render(<SkynetSectionsPanel data={data} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rename Leadership' }));
    const box = screen.getByRole('textbox', { name: 'Rename Leadership' }) as HTMLInputElement;
    fireEvent.change(box, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({ sectionTitles: { positions: '' } });
    rerender(<SkynetSectionsPanel data={{ ...SAMPLE, sectionTitles: { positions: '' } }} onChange={onChange} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
    fireEvent.blur(screen.getByRole('textbox'));
    expect(onChange).toHaveBeenLastCalledWith({ sectionTitles: {} });
  });

  it('caps a title at 60 characters', () => {
    render(<SkynetSectionsPanel data={SAMPLE} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rename Position of Responsibility' }));
    expect(screen.getByRole('textbox').getAttribute('maxlength')).toBe('60');
  });

  it('only says a section was renamed when one really was', () => {
    const official = { ...SAMPLE, sectionTitles: { positions: 'Position of Responsibility', extras: ' ' } };
    const { rerender } = render(<SkynetSectionsPanel data={official} onChange={vi.fn()} />);
    expect(screen.queryByText(/You have renamed a standard section/)).toBeNull();
    rerender(<SkynetSectionsPanel data={{ ...SAMPLE, sectionTitles: { positions: 'Leadership' } }} onChange={vi.fn()} />);
    expect(screen.getByText(/You have renamed a standard section/)).toBeTruthy();
  });

  it('starts a new custom section with an empty name, not "New Section"', () => {
    const onChange = vi.fn();
    render(<SkynetSectionsPanel data={SAMPLE} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Add section' }));
    expect(onChange.mock.calls[0][0].customSections[0].label).toBe('');
  });
});

describe('corrupted drafts load instead of blanking the page', () => {
  it('survives junk titles, labels, groups and bullets', () => {
    const junk = {
      ...SAMPLE,
      sectionTitles: { education: 5, positions: 'Leadership' },
      customSections: [
        { key: 'custom:1', label: 7, groups: [null, { bullets: 'x' }, { category: 'Ok', bullets: [null, { text: 'Fine' }] }] },
      ],
      sectionOrder: [...SAMPLE.sectionOrder, 'custom:1'],
      experience: [null, { ...SAMPLE.experience[0], subSections: 'oops' }],
      positions: [{ title: 'P', year: '', bullets: null, hiddenBullets: [true] }],
    };
    const data = hydrateSkynet(junk as never);
    expect(data.sectionTitles).toEqual({ positions: 'Leadership' });
    expect(data.customSections[0].label).toBe('');
    // The null group is dropped; the one with junk bullets keeps an empty list.
    expect(data.customSections[0].groups.map((g) => g.bullets.length)).toEqual([0, 1]);
    expect(() => render(<SkynetPreview data={data} />)).not.toThrow();
  });
});
