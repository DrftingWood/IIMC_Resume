import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { withoutHidden, sanitizeHidden, moveFlag, removeFlag, toggleFlag, countHidden, countHiddenInResume } from '@/lib/visibility';
import SkynetSectionsPanel from '@/templates/skynet/SectionsPanel';
import { emptyVisibleSections } from '@/lib/emptySections';
import SupersetPreview from '@/templates/superset/Preview';
import SkynetPreview from '@/templates/skynet/Preview';
import SkynetForm from '@/templates/skynet/Form';
import { emptySupersetResume } from '@/templates/superset/types';
import { emptySkynetResume } from '@/templates/skynet/types';
import type { SkynetResumeData } from '@/templates/skynet/types';
import { hydrateSuperset } from '@/templates/superset/hydrate';
import { hydrateSkynet } from '@/templates/skynet/hydrate';
import { PositionsForm } from '@/templates/skynet/form-sections/PositionsForm';

/** A small resume with one of everything, nothing hidden. */
function resume(): SkynetResumeData {
  return {
    ...emptySkynetResume(),
    hiddenSections: [],
    education: [
      { degree: 'PGDM', institute: 'IIM Calcutta', gpa: '8.1', year: '2026' },
      { degree: 'B.Tech', institute: 'NIT', gpa: '8.4', year: '2022' },
    ],
    distinctions: [
      {
        category: 'Scholastic',
        bullets: [
          { text: 'Kept point', year: '2024' },
          { text: 'Spare point', year: '2023' },
        ],
      },
      { category: 'Competitions', bullets: [{ text: 'Case winner', year: '2025' }] },
    ],
    experience: [
      {
        type: 'Full Time',
        firm: 'Acme',
        role: 'Analyst',
        dates: '2022-24',
        subSections: [
          { label: 'Impact', bullets: ['Shipped pricing', 'Cut churn'] },
          { label: 'Awards', bullets: ['Star award'] },
        ],
      },
      { type: 'Intern', firm: 'Beta', role: 'Intern', dates: '2025', subSections: [] },
    ],
    positions: [
      { title: 'Club Head', bullets: ['Led 20 people', 'Ran fest'], year: '2025' },
      { title: 'Class Rep', bullets: ['Represented batch'], year: '2024' },
    ],
  };
}

describe('withoutHidden', () => {
  it('leaves a resume with nothing hidden unchanged', () => {
    const data = resume();
    expect(withoutHidden(data)).toEqual(data);
  });

  it('drops a hidden bullet but keeps the rest of its group', () => {
    const data = resume();
    data.distinctions[0].bullets[1].hidden = true;
    const out = withoutHidden(data);
    expect(out.distinctions[0].bullets.map((b) => b.text)).toEqual(['Kept point']);
    expect(out.distinctions).toHaveLength(2);
  });

  it('drops a whole hidden group, education row, entry and position', () => {
    const data = resume();
    data.distinctions[1].hidden = true;
    data.education[1].hidden = true;
    data.experience[1].hidden = true;
    data.positions[1].hidden = true;
    const out = withoutHidden(data);
    expect(out.distinctions.map((g) => g.category)).toEqual(['Scholastic']);
    expect(out.education.map((r) => r.degree)).toEqual(['PGDM']);
    expect(out.experience.map((e) => e.firm)).toEqual(['Acme']);
    expect(out.positions.map((p) => p.title)).toEqual(['Club Head']);
  });

  it('drops hidden plain-text bullets and hidden sub-sections', () => {
    const data = resume();
    data.experience[0].subSections[0].hiddenBullets = [false, true];
    data.experience[0].subSections[1].hidden = true;
    data.positions[0].hiddenBullets = [true, false];
    const out = withoutHidden(data);
    expect(out.experience[0].subSections).toEqual([{ label: 'Impact', bullets: ['Shipped pricing'] }]);
    expect(out.positions[0].bullets).toEqual(['Ran fest']);
  });

  it('drops a group or sub-section once every point in it is hidden', () => {
    const data = resume();
    data.distinctions[1].bullets[0].hidden = true;
    data.experience[0].subSections[1].hiddenBullets = [true];
    data.positions[1].hiddenBullets = [true];
    const out = withoutHidden(data);
    expect(out.distinctions.map((g) => g.category)).toEqual(['Scholastic']);
    expect(out.experience[0].subSections.map((s) => s.label)).toEqual(['Impact']);
    expect(out.positions.map((p) => p.title)).toEqual(['Club Head']);
  });

  it('keeps hiding an entry separate from the points inside it', () => {
    const data = resume();
    data.distinctions[0].bullets[1].hidden = true;
    data.distinctions[0].hidden = true;
    expect(withoutHidden(data).distinctions.map((g) => g.category)).toEqual(['Competitions']);
    data.distinctions[0].hidden = false;
    expect(withoutHidden(data).distinctions[0].bullets.map((b) => b.text)).toEqual(['Kept point']);
  });

  it('does not change the data it was given', () => {
    const data = resume();
    data.distinctions[0].bullets[1].hidden = true;
    const before = JSON.stringify(data);
    withoutHidden(data);
    expect(JSON.stringify(data)).toBe(before);
  });
});

describe('flag helpers for plain-text bullets', () => {
  it('toggles one flag, padding the list to the bullet count', () => {
    expect(toggleFlag(undefined, 1, 3)).toEqual([false, true, false]);
    expect(toggleFlag([false, true, false], 1, 3)).toEqual([false, false, false]);
  });

  it('moves a flag with its bullet', () => {
    expect(moveFlag([true, false, false], 0, 1, 3)).toEqual([false, true, false]);
    expect(moveFlag(undefined, 0, 1, 2)).toEqual([false, false]);
  });

  it('removes a flag with its bullet', () => {
    expect(removeFlag([false, true, false], 0, 3)).toEqual([true, false]);
  });
});

describe('preview and PDF', () => {
  it('skynet leaves out hidden points and entries', () => {
    const data = resume();
    data.distinctions[0].bullets[1].hidden = true;
    data.experience[0].subSections[0].hiddenBullets = [true, false];
    data.positions[1].hidden = true;
    render(<SkynetPreview data={data} />);
    expect(screen.queryByText('Spare point')).toBeNull();
    expect(screen.queryByText('Shipped pricing')).toBeNull();
    expect(screen.queryByText('Class Rep')).toBeNull();
    expect(screen.getByText('Kept point')).toBeTruthy();
    expect(screen.getByText('Cut churn')).toBeTruthy();
    expect(screen.getByText('Club Head')).toBeTruthy();
  });

  it('superset leaves out hidden points and entries', () => {
    const data = {
      ...emptySupersetResume(),
      distinctions: [
        { category: 'Scholastic', bullets: [{ text: 'Shown', year: '' }, { text: 'Gone', year: '', hidden: true }] },
      ],
      education: [{ degree: 'PGDM', institute: 'IIMC', gpa: '8', year: '2026', hidden: true }],
    };
    render(<SupersetPreview data={data} />);
    expect(screen.getByText('Shown')).toBeTruthy();
    expect(screen.queryByText('Gone')).toBeNull();
    expect(screen.queryByText('PGDM')).toBeNull();
  });
});

describe('saved resumes', () => {
  it('loads a resume saved before this feature with everything visible', () => {
    const old = JSON.parse(JSON.stringify(resume()));
    expect(hydrateSkynet(old)).toEqual(hydrateSkynet(resume()));
    expect(withoutHidden(hydrateSkynet(old)).positions[0].bullets).toEqual(['Led 20 people', 'Ran fest']);
  });

  it('keeps hidden choices through save and reload', () => {
    const data = resume();
    data.distinctions[0].bullets[1].hidden = true;
    data.positions[0].hiddenBullets = [false, true];
    const reloaded = hydrateSkynet(JSON.parse(JSON.stringify(data)));
    expect(reloaded.distinctions[0].bullets[1].hidden).toBe(true);
    expect(reloaded.positions[0].hiddenBullets).toEqual([false, true]);
  });

  it('repairs a flag list that no longer matches its bullets', () => {
    const data = resume() as unknown as Record<string, unknown>;
    (data.positions as { hiddenBullets?: unknown }[])[0].hiddenBullets = [true, 'x', true, true];
    (data.positions as { hiddenBullets?: unknown }[])[1].hiddenBullets = 'junk';
    const out = sanitizeHidden(hydrateSuperset(data as never));
    expect(out.positions[0].hiddenBullets).toEqual([true, false]);
    expect(out.positions[1].hiddenBullets).toBeUndefined();
  });
});

describe('editor', () => {
  it('hides a point with its eye button and greys it out', () => {
    const onChange = vi.fn();
    const data = resume();
    render(<PositionsForm data={data} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /position of responsibility/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide bullet 2 in position 1 from resume' }));
    expect(onChange).toHaveBeenCalledWith({
      positions: [{ ...data.positions[0], hiddenBullets: [false, true] }, data.positions[1]],
    });
  });

  it('shows a hidden point as hidden, with its eye button pressed', () => {
    const data = resume();
    data.positions[0].hiddenBullets = [false, true];
    render(<PositionsForm data={data} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /position of responsibility/i }));
    const show = screen.getByRole('button', { name: 'Hide bullet 2 in position 1 from resume' });
    expect(show.getAttribute('aria-pressed')).toBe('true');
    expect(
      screen.getByRole('button', { name: 'Hide bullet 1 in position 1 from resume' }).getAttribute('aria-pressed')
    ).toBe('false');
    expect(within(show.closest('[data-hidden]') as HTMLElement).getByText(/hidden/i)).toBeTruthy();
  });

  it('carries a hidden flag along when a point is moved', () => {
    const onChange = vi.fn();
    const data = resume();
    data.positions[0].hiddenBullets = [true, false];
    render(<PositionsForm data={data} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /position of responsibility/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Move bullet 1 in position 1 down' }));
    expect(onChange).toHaveBeenCalledWith({
      positions: [
        { ...data.positions[0], bullets: ['Ran fest', 'Led 20 people'], hiddenBullets: [false, true] },
        data.positions[1],
      ],
    });
  });

  it('offers a hide button on every kind of entry in the full form', () => {
    render(<SkynetForm data={resume()} onChange={vi.fn()} />);
    for (const title of ['Academic Profile', 'Academic Distinctions', 'Industry Experience', 'Position of Responsibility']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(title, 'i') }));
    }
    // 2 education rows, 2 groups + 3 bullets, 2 entries + 2 sub-sections + 3 bullets, 2 positions + 3 bullets.
    expect(screen.getAllByRole('button', { name: /^Hide .+ from resume$/ })).toHaveLength(19);
  });
});

describe('empty-section warning', () => {
  it('counts a section as empty when everything in it is hidden', () => {
    const data = resume();
    data.positions.forEach((p) => (p.hidden = true));
    expect(emptyVisibleSections('skynet', data)).toContain('Position of Responsibility');
    expect(emptyVisibleSections('skynet', resume())).not.toContain('Position of Responsibility');
  });
});

describe('hidden counts', () => {
  it('counts a hidden entry once and hidden points inside shown entries', () => {
    const data = resume();
    data.positions[0].hiddenBullets = [true, false];
    data.positions[1].hidden = true;
    data.distinctions[0].bullets[1].hidden = true;
    data.experience[0].subSections[1].hidden = true;
    expect(countHidden(data.positions)).toBe(2);
    expect(countHiddenInResume(data)).toBe(4);
  });

  it('shows the count on the panel title and in the Sections panel', () => {
    const data = resume();
    data.positions[0].hiddenBullets = [true, true];
    render(<PositionsForm data={data} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Position of Responsibility · 2 hidden' })).toBeTruthy();
    render(<SkynetSectionsPanel data={data} onChange={vi.fn()} />);
    expect(screen.getByText(/2 hidden items won.t print/)).toBeTruthy();
  });
});
