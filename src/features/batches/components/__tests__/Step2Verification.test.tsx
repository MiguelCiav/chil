import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Step2Verification } from '../wizard/Step2Verification';
import { MemberVerificationResult } from '../../types';

describe('Step2Verification component', () => {
  const defaultProps = {
    batchName: 'Lote San Luis',
    youngCedulas: '29111222',
    setYoungCedulas: vi.fn(),
    adultCedulas: '12333444',
    setAdultCedulas: vi.fn(),
    isVerifying: false,
    verifyProgress: { current: 0, total: 2 },
    verificationList: [] as MemberVerificationResult[],
    handleVerify: vi.fn(),
    verifyCedula: vi.fn(),
    handleToggleMemberType: vi.fn(),
    handleStep2Continue: vi.fn(),
    onBack: vi.fn()
  };

  it('renders inputs and header info', () => {
    render(<Step2Verification {...defaultProps} />);

    expect(screen.getByText('Verificación de Cédulas')).toBeInTheDocument();
    expect(screen.getByText('Lote: Lote San Luis')).toBeInTheDocument();
    expect(screen.getByLabelText(/Cédulas de Jóvenes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cédulas de Adultos/i)).toBeInTheDocument();
    expect(screen.getByText('Iniciar Verificación')).toBeInTheDocument();
  });

  it('handles textarea changes and verify click', () => {
    render(<Step2Verification {...defaultProps} />);

    const youngInput = screen.getByLabelText(/Cédulas de Jóvenes/i);
    fireEvent.change(youngInput, { target: { value: '29111222\n29333444' } });
    expect(defaultProps.setYoungCedulas).toHaveBeenCalledWith('29111222\n29333444');

    const verifyBtn = screen.getByText('Iniciar Verificación');
    fireEvent.click(verifyBtn);
    expect(defaultProps.handleVerify).toHaveBeenCalled();
  });

  it('renders verification progress and disabled state when isVerifying is true', () => {
    render(
      <Step2Verification
        {...defaultProps}
        isVerifying={true}
        verifyProgress={{ current: 1, total: 2 }}
      />
    );

    expect(screen.getByText('Verificando (1/2)...')).toBeDisabled();
    expect(screen.getByLabelText(/Cédulas de Jóvenes/i)).toBeDisabled();
  });

  it('renders verification results table with status tags and toggle buttons', () => {
    const list: MemberVerificationResult[] = [
      {
        cedula: '29111222',
        name: 'Ana Perez',
        status: 'Registro válido',
        type: 'young'
      },
      {
        cedula: '12333444',
        name: 'Carlos Gomez',
        status: 'No registrado',
        type: 'adult'
      },
      {
        cedula: '30555666',
        name: '',
        status: 'Consultando...',
        type: 'young'
      },
      {
        cedula: '40777888',
        name: 'Error Member',
        status: 'Error de red',
        type: 'adult'
      }
    ];

    render(
      <Step2Verification
        {...defaultProps}
        youngCedulas={'29111222\n30555666'}
        adultCedulas={'12333444\n40777888'}
        verificationList={list}
      />
    );

    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.getByText('Registro válido')).toBeInTheDocument();
    expect(screen.getByText('No registrado')).toBeInTheDocument();
    expect(screen.getByText('Consultando...')).toBeInTheDocument();
    expect(screen.getByText('Error de red')).toBeInTheDocument();

    // Test retry button on network error
    const retryButtons = screen.getAllByTitle('Reintentar verificación');
    fireEvent.click(retryButtons[0]);
    expect(defaultProps.verifyCedula).toHaveBeenCalledWith('40777888', 'adult');

    // Test toggle member type button
    const toggleButtons = screen.getAllByText('Adulto');
    fireEvent.click(toggleButtons[0]);
    expect(defaultProps.handleToggleMemberType).toHaveBeenCalledWith('29111222');

    // Test Continue button
    const continueBtn = screen.getByText('Validar y Continuar');
    expect(continueBtn).not.toBeDisabled();
    fireEvent.click(continueBtn);
    expect(defaultProps.handleStep2Continue).toHaveBeenCalled();

    // Test Back button
    const backBtn = screen.getByText('Atrás');
    fireEvent.click(backBtn);
    expect(defaultProps.onBack).toHaveBeenCalled();
  });
});
