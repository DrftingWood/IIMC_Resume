import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderInline } from '@/lib/bold';
import { visibleLength } from '@/lib/lineFill';

describe('bold runs that contain an asterisk', () => {
  it('renders "A*" inside bold instead of printing the markers', () => {
    const { container } = render(<p>{renderInline('Got **A* distinctions** in 2 courses')}</p>);
    expect(container.textContent).toBe('Got A* distinctions in 2 courses');
    expect(container.querySelector('strong')?.textContent).toBe('A* distinctions');
  });

  it('keeps separate bold runs separate', () => {
    const { container } = render(<p>{renderInline('**x** and **y**')}</p>);
    expect([...container.querySelectorAll('strong')].map((s) => s.textContent)).toEqual(['x', 'y']);
  });

  it('counts the characters the page shows', () => {
    expect(visibleLength('Got **A* distinctions**')).toBe('Got A* distinctions'.length);
  });
});
