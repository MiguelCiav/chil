import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '../Button';

describe('Button component', () => {
  it('supports destructive variant with WCAG AA tokens', () => {
    render(<Button variant="destructive">Eliminar lote</Button>);

    const button = screen.getByRole('button', { name: 'Eliminar lote' });
    expect(button).toHaveClass('bg-red-700', 'text-white', 'hover:bg-red-800', 'focus-visible:ring-red-700');
  });

  it('forwards ref to the underlying button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Acción</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Acción' }));
  });
});
