import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorAlert } from '../ErrorAlert';

describe('ErrorAlert component', () => {
  it('renders inline variant with optional retry callback', () => {
    const onRetry = vi.fn();
    render(<ErrorAlert variant="inline" message="Error al cargar lotes." onRetry={onRetry} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Error al cargar lotes.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders centered variant with title and retry button', () => {
    const onRetry = vi.fn();
    render(
      <ErrorAlert
        variant="centered"
        title="No se pudo cargar el detalle"
        message="Intenta nuevamente."
        onRetry={onRetry}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toContainElement(screen.getByRole('heading', { name: 'No se pudo cargar el detalle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders compact variant without retry button', () => {
    render(<ErrorAlert variant="compact" message="Credenciales inválidas." />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Credenciales inválidas.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
