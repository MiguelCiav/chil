import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemberStatusBadge } from '../MemberStatusBadge';

describe('MemberStatusBadge component', () => {
  it('renders canonical labels and accessible palettes for active, exceptional, and pending', () => {
    const { rerender } = render(<MemberStatusBadge status="active" />);
    expect(screen.getByText('Registro Válido').closest('span')).toHaveClass(
      'bg-emerald-50',
      'text-emerald-800',
      'border-emerald-200'
    );

    rerender(<MemberStatusBadge status="exceptional" />);
    expect(screen.getByText('Emisión Excepcional').closest('span')).toHaveClass(
      'bg-purple-50',
      'text-purple-800',
      'border-purple-200'
    );

    rerender(<MemberStatusBadge status="pending" />);
    expect(screen.getByText('Registro Inválido').closest('span')).toHaveClass(
      'bg-rose-50',
      'text-rose-800',
      'border-rose-200'
    );
  });

  it('supports solventUntil for active members and explicit labelOverride', () => {
    const { rerender } = render(<MemberStatusBadge status="active" solventUntil="2026-12-31" />);
    expect(screen.getByText('Solvente hasta 2026-12-31')).toBeInTheDocument();

    rerender(
      <MemberStatusBadge status="pending" solventUntil="2026-12-31" labelOverride="Pendiente" />
    );
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });
});
