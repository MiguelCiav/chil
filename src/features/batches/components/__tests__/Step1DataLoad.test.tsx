import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Step1DataLoad } from '../wizard/Step1DataLoad';
import { WizardStepper } from '../wizard/WizardStepper';

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

  it('renders only recognition type, batch comment, and cedulas fields without CardHeader or removed badges', () => {
    render(
      <MemoryRouter>
        <Step1DataLoad {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.queryByText('Carga de Datos del Lote')).not.toBeInTheDocument();
    expect(screen.queryByText('Paso 1 de 2')).not.toBeInTheDocument();
    expect(screen.queryByText(/cédulas? detectadas?/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Importar archivo')).not.toBeInTheDocument();

    expect(screen.getByLabelText('Tipo de Reconocimiento')).toBeInTheDocument();
    expect(screen.getByLabelText('Título o Comentario del Lote')).toBeInTheDocument();
    expect(screen.getByText('Cédulas de Identidad *')).toBeInTheDocument();
    expect(screen.getByLabelText('Cédulas de Identidad')).toHaveAttribute(
      'placeholder',
      '12345678\n23456789\n34567890'
    );
    expect(screen.queryByText(/Jóvenes y Adultos/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Nota: No necesitas separar jóvenes de adultos/i)
    ).not.toBeInTheDocument();
  });
});

describe('WizardStepper', () => {
  it('renders step titles Carga and Confirmación without removed subtitles', () => {
    render(<WizardStepper currentStep={1} onStepClick={vi.fn()} />);

    expect(screen.getByText('Carga')).toBeInTheDocument();
    expect(screen.getByText('Confirmación')).toBeInTheDocument();
    expect(screen.queryByText('Carga de Datos')).not.toBeInTheDocument();
    expect(screen.queryByText('Edición y Confirmación')).not.toBeInTheDocument();
    expect(screen.queryByText('Cédulas y Reconocimiento')).not.toBeInTheDocument();
    expect(screen.queryByText('Revisión y Emisión')).not.toBeInTheDocument();
  });
});
