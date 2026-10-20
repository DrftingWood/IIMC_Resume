import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkynetPreview from '@/templates/skynet/Preview';
import SupersetPreview from '@/templates/superset/Preview';
import SkynetSectionsPanel from '@/templates/skynet/SectionsPanel';
import { SAMPLE as SKYNET } from '@/templates/skynet/sample';
import { SAMPLE as SUPERSET } from '@/templates/superset/sample';
import { hydrateSkynet } from '@/templates/skynet/hydrate';
import { hydrateSuperset } from '@/templates/superset/hydrate';

describe('compact mode', () => {
  it('leaves the official page untouched by default', () => {
    const { container } = render(<SkynetPreview data={SKYNET} />);
    expect(container.firstElementChild!.className).toBe('skynet-page');
  });

  it('tags the page so the stylesheet can tighten the rows', () => {
    const { container } = render(<SkynetPreview data={{ ...SKYNET, density: 'compact45' }} />);
    expect(container.firstElementChild!.className).toBe('skynet-page density-compact45');
    const { container: c2 } = render(<SupersetPreview data={{ ...SUPERSET, density: 'compact40' }} />);
    expect(c2.firstElementChild!.className).toBe('f1-page density-compact40');
  });

  it('switches density from the Sections panel and warns it is not official', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SkynetSectionsPanel data={SKYNET} onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Official' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('note')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Tightest' }));
    expect(onChange).toHaveBeenCalledWith({ density: 'compact45' });
    rerender(<SkynetSectionsPanel data={{ ...SKYNET, density: 'compact45' }} onChange={onChange} />);
    expect(screen.getByRole('note').textContent).toMatch(/not the official IIMC layout/i);
    expect(screen.getByText(/About 45 points fit on one page/)).toBeTruthy();
  });

  it('keeps a saved density and drops an unknown one', () => {
    expect(hydrateSkynet({ ...SKYNET, density: 'compact40' }).density).toBe('compact40');
    expect(hydrateSkynet({ ...SKYNET, density: 'tiny' as never }).density).toBeUndefined();
    expect(hydrateSuperset({ ...SUPERSET, density: 7 as never }).density).toBeUndefined();
    expect(hydrateSuperset({ ...SUPERSET }).density).toBeUndefined();
  });
});
