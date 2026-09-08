import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Form from '@/templates/skynet/Form';
import { SAMPLE } from '@/templates/skynet/sample';

describe('skynet form', () => {
  it('offers an accordion for each editable section', () => {
    render(<Form data={SAMPLE} onChange={vi.fn()} />);
    for (const title of [
      'Academic Profile',
      'Academic Distinctions & Co-Curricular Achievements',
      'Projects and Papers',
      'Entrepreneurial/Non-Profit Venture',
      'Industry Experience',
      'Position of Responsibility',
      'Extra-Curricular Achievements',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(title, 'i') })).toBeTruthy();
    }
  });
});
