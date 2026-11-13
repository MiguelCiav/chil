import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Step1DataLoad } from '../wizard/Step1DataLoad';

describe('Step1DataLoad UI cleanup', () => {
  const defaultProps = {
    recognitionTypes: [
      { id: 'sct-wood-badge', name: 'Insignia de Madera', created_at: '2026-01-01' }
    ],
    loadingRecognitionTypes: false,
    isVerifying: false,
    verifyProgress: { current: 0, total: 0 },
    onSubmitStep1: vi.fn()
  };

  it('right-aligns Paso 1 de 2 directly inside CardHeader and removes adult/youth hints', () => {
    render(
      <MemoryRouter>
        <Step1DataLoad {...defaultProps} />
      </MemoryRouter>
    );

    const stepBadge = screen.getByText('Paso 1 de 2');
    const title = screen.getByText('Carga de Datos del Lote');
    expect(stepBadge).toBeInTheDocument();
    // Title wrapper div and step badge must be siblings under CardHeader
    expect(title.parentElement?.parentElement).toBe(stepBadge.parentElement);
    expect(stepBadge.parentElement).toHaveClass('justify-between');

    expect(screen.getByText('Cédulas de Identidad *')).toBeInTheDocument();
    expect(screen.queryByText(/Jóvenes y Adultos/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Nota: No necesitas separar jóvenes de adultos/i)
    ).not.toBeInTheDocument();
  });
});
