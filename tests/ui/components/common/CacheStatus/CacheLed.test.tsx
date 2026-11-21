import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CacheLed from '@/components/common/CacheStatus/CacheLed';

describe('CacheLed', () => {
  it.each(['none', 'caching', 'cached', 'error'] as const)('shows the state "%s" as data-status', (state) => {
    const { container } = render(<CacheLed state={state} />);
    const dot = container.querySelector('.CacheLed');

    expect(dot.getAttribute('data-status')).toBe(state);
    expect(dot.getAttribute('aria-hidden')).toBe('true');
  });

  it('is not rendered without a service worker', () => {
    const { container } = render(<CacheLed state="unavailable" />);
    expect(container.innerHTML).toBe('');
  });

  it('is an image with a name when it gets a label', () => {
    render(<CacheLed label="Available offline" state="cached" />);
    expect(screen.getByRole('img', { name: 'Available offline' }).getAttribute('data-status')).toBe('cached');
  });
});
