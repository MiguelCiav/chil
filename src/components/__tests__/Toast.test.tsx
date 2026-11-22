import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Toast } from '../Toast';

describe('Toast component', () => {
  it('renders success status with polite live region and dark neutral surface by default', () => {
    render(<Toast message="Cambios guardados" />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Cambios guardados');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveClass('bg-neutral');
  });

  it('renders warning and error variants with assertive alert role', () => {
    const { rerender } = render(<Toast message="PDF multipágina" variant="warning" />);

    const warningAlert = screen.getByRole('alert');
    expect(warningAlert).toHaveTextContent('PDF multipágina');
    expect(warningAlert).toHaveAttribute('aria-live', 'assertive');
    expect(warningAlert).toHaveClass('bg-amber-900');

    rerender(<Toast message="Error al guardar" variant="error" />);
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveClass('bg-red-900');
  });

  it('renders dismiss button when onDismiss is provided and invokes it on click', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Aviso" variant="warning" onDismiss={onDismiss} />);

    const closeBtn = screen.getByRole('button', { name: 'Cerrar notificación' });
    fireEvent.click(closeBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
