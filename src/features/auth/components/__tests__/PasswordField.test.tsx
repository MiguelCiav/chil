import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PasswordField } from '../PasswordField';

describe('PasswordField component', () => {
  it('toggles visibility with accessible labels', () => {
    render(<PasswordField label="Contraseña" placeholder="••••••••" />);

    const input = screen.getByLabelText('Contraseña') as HTMLInputElement;
    expect(input.type).toBe('password');

    const showBtn = screen.getByRole('button', { name: 'Ver contraseña' });
    fireEvent.click(showBtn);
    expect(input.type).toBe('text');

    const hideBtn = screen.getByRole('button', { name: 'Ocultar contraseña' });
    fireEvent.click(hideBtn);
    expect(input.type).toBe('password');
  });

  it('forwards ref to underlying input and renders labelAction', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(
      <PasswordField
        ref={ref}
        label="Contraseña"
        labelAction={<button type="button">¿Olvidaste?</button>}
      />
    );

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByLabelText('Contraseña'));
    expect(screen.getByRole('button', { name: '¿Olvidaste?' })).toBeInTheDocument();
  });

  it('renders error state with role="alert", aria-invalid, and aria-describedby', () => {
    render(
      <PasswordField
        label="Contraseña"
        errorText="La contraseña es requerida"
      />
    );

    const input = screen.getByLabelText('Contraseña');
    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('La contraseña es requerida');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', alert.id);
    expect(input).toHaveClass('border-red-600');
  });
});
