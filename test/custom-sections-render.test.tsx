import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkynetPreview from '@/templates/skynet/Preview';
import SupersetPreview from '@/templates/superset/Preview';
import SkynetForm from '@/templates/skynet/Form';
import SupersetForm from '@/templates/superset/Form';
import { SAMPLE as SKYNET_SAMPLE } from '@/templates/skynet/sample';
import { SAMPLE as SUPERSET_SAMPLE } from '@/templates/superset/sample';
import type { CustomSection as SkynetCustom } from '@/templates/skynet/types';

const volunteering: SkynetCustom = {
  key: 'custom:1',
  label: 'Volunteering',
  groups: [
    {
      category: 'Teaching',
      bullets: [
        { text: 'Taught maths to 40 children', year: '2024' },
        { text: 'Ran a weekend library', year: '2023', hidden: true },
      ],
    },
  ],
};

function skynetWithCustom() {
  return {
    ...SKYNET_SAMPLE,
    customSections: [volunteering],
    sectionOrder: ['education', 'custom:1', ...SKYNET_SAMPLE.sectionOrder.filter((k) => k !== 'education')],
  } as typeof SKYNET_SAMPLE;
}

describe('custom sections on the page', () => {
  it('skynet draws a custom section where it sits in the order', () => {
    render(<SkynetPreview data={skynetWithCustom()} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings.slice(0, 2)).toEqual(['ACADEMIC PROFILE', 'VOLUNTEERING']);
    expect(screen.getByText('Teaching')).toBeTruthy();
    expect(screen.getByText('Taught maths to 40 children')).toBeTruthy();
    expect(screen.queryByText('Ran a weekend library')).toBeNull();
  });

  it('skynet leaves out a switched-off custom section', () => {
    render(<SkynetPreview data={{ ...skynetWithCustom(), hiddenSections: ['custom:1'] }} />);
    expect(screen.queryByText('VOLUNTEERING')).toBeNull();
  });

  it('superset draws a custom section too', () => {
    const data = {
      ...SUPERSET_SAMPLE,
      customSections: [volunteering],
      sectionOrder: [...SUPERSET_SAMPLE.sectionOrder, 'custom:1'],
    } as typeof SUPERSET_SAMPLE;
    render(<SupersetPreview data={data} />);
    expect(screen.getByText('VOLUNTEERING')).toBeTruthy();
    expect(screen.getByText('Taught maths to 40 children')).toBeTruthy();
  });

  it('prints a renamed built-in section under its new title', () => {
    render(<SkynetPreview data={{ ...SKYNET_SAMPLE, sectionTitles: { extras: 'Sports & Culture' } }} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toContain('SPORTS & CULTURE');
    expect(headings).not.toContain('EXTRA-CURRICULAR ACHIEVEMENTS');
  });

  it('prints an untitled custom section under a placeholder title', () => {
    render(<SkynetPreview data={{ ...skynetWithCustom(), customSections: [{ ...volunteering, label: ' ' }] }} />);
    expect(screen.getByText('UNTITLED SECTION')).toBeTruthy();
  });
});

describe('custom sections in the editor', () => {
  it('skynet gives each custom section its own panel and saves edits to it', () => {
    const onChange = vi.fn();
    render(<SkynetForm data={skynetWithCustom()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volunteering' }));
    fireEvent.change(screen.getByDisplayValue('Teaching'), { target: { value: 'Mentoring' } });
    const saved = onChange.mock.calls.at(-1)![0].customSections;
    expect(saved[0].key).toBe('custom:1');
    expect(saved[0].label).toBe('Volunteering');
    expect(saved[0].groups[0].category).toBe('Mentoring');
  });

  it('superset gives each custom section its own panel', () => {
    const data = {
      ...SUPERSET_SAMPLE,
      customSections: [volunteering],
      sectionOrder: [...SUPERSET_SAMPLE.sectionOrder, 'custom:1'],
    } as typeof SUPERSET_SAMPLE;
    render(<SupersetForm data={data} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Volunteering' })).toBeTruthy();
  });

  it('labels a built-in panel with its renamed title', () => {
    render(<SkynetForm data={{ ...SKYNET_SAMPLE, sectionTitles: { extras: 'Sports & Culture' } }} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Sports & Culture' })).toBeTruthy();
  });
});
