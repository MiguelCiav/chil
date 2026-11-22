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

  it('generates unique fallback IDs via useId and preserves explicit id props', () => {
    render(
      <>
        <Field label="Nombre" />
        <Field label="Nombre" />
        <Field id="custom-field-id" label="Personalizado" />
      </>
    );

    const inputs = screen.getAllByLabelText('Nombre');
    expect(inputs).toHaveLength(2);
    expect(inputs[0].id).toBeTruthy();
    expect(inputs[1].id).toBeTruthy();
    expect(inputs[0].id).not.toBe(inputs[1].id);

    const custom = screen.getByLabelText('Personalizado');
    expect(custom.id).toBe('custom-field-id');
  });

  it('supports md and sm control sizes', () => {
    render(
      <>
        <Field label="Estándar" size="md" />
        <Field label="Compacto" size="sm" />
      </>
    );

    expect(screen.getByLabelText('Estándar')).toHaveClass('py-2.5', 'px-4', 'text-sm', 'rounded-field');
    expect(screen.getByLabelText('Compacto')).toHaveClass('py-2', 'px-3', 'text-xs', 'rounded-lg');
  });
});
