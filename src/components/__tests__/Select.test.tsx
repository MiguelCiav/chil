import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Select } from '../Select';

describe('Select component', () => {
  it('forwards ref and renders unique fallback IDs across concurrent selects', () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <>
        <Select ref={ref} label="Región">
          <option value="1">Capital</option>
        </Select>
        <Select label="Región">
          <option value="2">Zulia</option>
        </Select>
      </>
    );

    const selects = screen.getAllByLabelText('Región');
    expect(selects).toHaveLength(2);
    expect(ref.current).toBe(selects[0]);
    expect(selects[0].id).toBeTruthy();
    expect(selects[1].id).toBeTruthy();
    expect(selects[0].id).not.toBe(selects[1].id);
  });

  it('supports size variants, aria-label without visible label, and error state', () => {
    render(
      <>
        <Select aria-label="Selector compacto" size="sm">
          <option value="10">10</option>
        </Select>
        <Select label="Reconocimiento" variant="error" errorText="Selecciona un reconocimiento">
          <option value="">Seleccione...</option>
        </Select>
      </>
    );

    const compact = screen.getByLabelText('Selector compacto');
    expect(compact).toHaveClass('py-2', 'px-3', 'text-xs', 'rounded-lg');

    const errorSelect = screen.getByLabelText('Reconocimiento');
    const alert = screen.getByRole('alert');
    expect(errorSelect).toHaveClass('border-red-600');
    expect(errorSelect).toHaveAttribute('aria-invalid', 'true');
    expect(errorSelect.getAttribute('aria-describedby')).toBe(alert.id);
    expect(alert).toHaveTextContent('Selecciona un reconocimiento');
  });
});
