import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Field } from '../Field';

describe('Field component accessibility & contrast', () => {
  it('renders visible label, >= 3:1 boundary, and accessible placeholder contrast by default', () => {
    render(<Field label="Nombre Completo" placeholder="Ej. Ana Silva" />);

    const input = screen.getByLabelText('Nombre Completo');
    expect(input).toHaveClass('border-primary/70');
    expect(input).toHaveClass('placeholder:text-neutral/75');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('links error message via aria-invalid, aria-describedby, and role="alert"', () => {
    render(
      <Field
        label="Correo"
        variant="error"
        errorText="Ingresa un correo válido"
      />
    );

    const input = screen.getByLabelText('Correo');
    const alert = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
    expect(alert).toHaveTextContent('Ingresa un correo válido');
    expect(alert).toHaveClass('text-red-700');
  });
});
