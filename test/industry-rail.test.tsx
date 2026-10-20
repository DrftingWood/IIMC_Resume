import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Preview from '@/templates/skynet/Preview';
import { SAMPLE } from '@/templates/skynet/sample';

function industryTable(container: HTMLElement) {
  return container.querySelector('table.sk-industry') as HTMLTableElement;
}

describe('Industry Experience rail', () => {
  it('draws the Full Time / Intern rail when entries have a type', () => {
    const { container } = render(<Preview data={SAMPLE} />);
    const table = industryTable(container);
    expect(table.querySelectorAll('td.sk-vertical').length).toBeGreaterThan(0);
    expect(table.querySelectorAll('col')).toHaveLength(3);
  });

  it('leaves the rail out when no entry has a type, as rail-less PDFs do', () => {
    const data = { ...SAMPLE, experience: SAMPLE.experience.map((e) => ({ ...e, type: '' })) };
    const { container } = render(<Preview data={data} />);
    const table = industryTable(container);
    expect(table.querySelectorAll('td.sk-vertical')).toHaveLength(0);
    const cols = [...table.querySelectorAll('col')].map((c) => (c as HTMLElement).style.width);
    // The label column takes the rail's width; the point column is unchanged.
    expect(cols).toEqual(['15.03%', '84.97%']);
  });

  it('spaces Industry sub-sections like the source: first and last rows marked', () => {
    const { container } = render(<Preview data={SAMPLE} />);
    const table = industryTable(container);
    expect(table.querySelectorAll('tr.sk-sub-first').length).toBeGreaterThan(0);
    expect(table.querySelectorAll('tr.sk-sub-last').length).toBeGreaterThan(0);
  });

  it('keeps one rail label for types that differ only by spaces', () => {
    const exp = SAMPLE.experience.map((e) => ({ ...e, type: 'Intern' }));
    exp[1] = { ...exp[1], type: 'Intern ' };
    const { container } = render(<Preview data={{ ...SAMPLE, experience: exp }} />);
    expect(industryTable(container).querySelectorAll('td.sk-vertical')).toHaveLength(1);
  });

  it('prints no bullet for an empty point in a sub-section', () => {
    const exp = SAMPLE.experience.map((e) => ({ ...e }));
    exp[0] = {
      ...exp[0],
      subSections: [{ ...exp[0].subSections[0], bullets: [''] }, ...exp[0].subSections.slice(1)],
    };
    const { container } = render(<Preview data={{ ...SAMPLE, experience: exp }} />);
    const first = industryTable(container).querySelector('td.sk-bullet-cell') as HTMLElement;
    expect(first.querySelector('.sk-bullet')).toBeNull();
  });
});

