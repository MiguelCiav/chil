import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { YoYVariationBadge } from '../YoYVariationBadge';

describe('YoYVariationBadge', () => {
  it('renders positive variation with green badge and up arrow', () => {
    render(<YoYVariationBadge diff={5} percentChange={25} />);

    expect(screen.getByText('+5 (+25%)')).toBeInTheDocument();
    const badge = screen.getByText('+5 (+25%)').closest('.inline-flex');
    expect(badge?.className).toContain('text-emerald-700');
  });

  it('renders positive variation without percent change when percentChange is null', () => {
    render(<YoYVariationBadge diff={10} percentChange={null} />);

    expect(screen.getByText('+10')).toBeInTheDocument();
    const badge = screen.getByText('+10').closest('.inline-flex');
    expect(badge?.className).toContain('text-emerald-700');
  });

  it('renders negative variation with red badge and down arrow', () => {
    render(<YoYVariationBadge diff={-3} percentChange={-15} />);

    expect(screen.getByText('-3 (-15%)')).toBeInTheDocument();
    const badge = screen.getByText('-3 (-15%)').closest('.inline-flex');
    expect(badge?.className).toContain('text-rose-700');
  });

  it('renders neutral zero variation with slate badge and equal sign', () => {
    render(<YoYVariationBadge diff={0} percentChange={0} />);

    expect(screen.getByText('0 (0%)')).toBeInTheDocument();
    const badge = screen.getByText('0 (0%)').closest('.inline-flex');
    expect(badge?.className).toContain('text-slate-600');
  });
});
