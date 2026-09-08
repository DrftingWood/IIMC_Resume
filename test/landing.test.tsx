import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Landing from '@/components/Landing';

describe('landing', () => {
  it('offers the two batch cards with their subtexts', () => {
    render(<Landing onReady={vi.fn()} />);
    expect(screen.getByText('61st batch and prior')).toBeTruthy();
    expect(screen.getByText('Superset')).toBeTruthy();
    expect(screen.getByText('62nd batch and later')).toBeTruthy();
    expect(screen.getByText('Skynet')).toBeTruthy();
  });

  it('no longer advertises other templates', () => {
    render(<Landing onReady={vi.fn()} />);
    expect(screen.queryByText(/Browse other templates/i)).toBeNull();
  });

  // The card's accessible name is "62nd batch and later Skynet"; the sample
  // link's is "See a sample — 62nd batch and later". Anchor the regexes so
  // each matches exactly one button.
  it('starts a blank resume in the chosen batch format', async () => {
    const onReady = vi.fn();
    render(<Landing onReady={onReady} />);
    await userEvent.click(screen.getByRole('button', { name: /^62nd batch and later/i }));
    expect(onReady).toHaveBeenCalledWith('skynet', expect.objectContaining({ name: '' }));
  });

  it('loads sample data from the tertiary link', async () => {
    const onReady = vi.fn();
    render(<Landing onReady={onReady} />);
    await userEvent.click(screen.getByRole('button', { name: /^See a sample.*62nd/i }));
    expect(onReady).toHaveBeenCalledWith('skynet', expect.objectContaining({ name: expect.any(String) }));
    expect(onReady.mock.calls[0][1].name).not.toBe('');
  });
});
