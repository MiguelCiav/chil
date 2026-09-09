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

  it('sanitizes non-numeric characters in cédula textareas', () => {
    render(<Step2Verification {...defaultProps} />);

    const youngInput = screen.getByLabelText(/Cédulas de Jóvenes/i);
    fireEvent.change(youngInput, { target: { value: 'V-29.111.222 abc\n30-444-555!' } });
    expect(defaultProps.setYoungCedulas).toHaveBeenCalledWith('29111222\n30444555');

    const adultInput = screen.getByLabelText(/Cédulas de Adultos/i);
    fireEvent.change(adultInput, { target: { value: 'V-12345678, test\n98765432' } });
    expect(defaultProps.setAdultCedulas).toHaveBeenCalledWith('12345678\n98765432');
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

  it('does not render UNIDAD column in verification results table', () => {
    const list: MemberVerificationResult[] = [
      {
        cedula: '29111222',
        name: 'Ana Perez',
        status: 'Registro válido',
        type: 'young',
        unit: 'caminantes'
      },
      {
        cedula: '12333444',
        name: 'Colaborador Juan',
        status: 'Registro válido',
        type: 'adult',
        unit: 'no_scout'
      }
    ];

    render(
      <Step2Verification
        {...defaultProps}
        verificationList={list}
      />
    );

    expect(screen.queryByText('Unidad')).not.toBeInTheDocument();
    expect(screen.queryByText('Caminantes')).not.toBeInTheDocument();
    expect(screen.queryByText('No scout')).not.toBeInTheDocument();
  });

  it('renders Grupo Scout column and calls onUpdateMemberGroup when groups are provided', () => {
    const list: MemberVerificationResult[] = [
      {
        cedula: '29111222',
        name: 'Ana Perez',
        status: 'Registro válido',
        type: 'young',
        group_id: 101
      }
    ];
    const mockGroups = [
      { id: 101, name: 'Grupo San Luis', district_id: 1 },
      { id: 102, name: 'Grupo La Salle', district_id: 1 }
    ];
    const onUpdateMemberGroup = vi.fn();

    render(
      <Step2Verification
        {...defaultProps}
        verificationList={list}
        groups={mockGroups}
        onUpdateMemberGroup={onUpdateMemberGroup}
      />
    );

    expect(screen.getByText('Grupo Scout')).toBeInTheDocument();
    const groupSelect = screen.getByLabelText(/Grupo scout de Ana Perez/i);
    expect(groupSelect).toBeInTheDocument();
    expect(groupSelect).toHaveValue('101');

    fireEvent.change(groupSelect, { target: { value: '102' } });
    expect(onUpdateMemberGroup).toHaveBeenCalledWith('29111222', 102);
  });

  it('opens member hierarchy modal and saves updated region, district, and group', () => {
    const list: MemberVerificationResult[] = [
      {
        cedula: '29111222',
        name: 'Ana Perez',
        status: 'Registro válido',
        type: 'young',
        region_id: 1,
        district_id: 10,
        group_id: 101
      }
    ];
    const mockRegions = [
      { id: 1, name: 'Región Capital' },
      { id: 2, name: 'Región Aragua' }
    ];
    const mockDistricts = [
      { id: 10, name: 'Distrito Sucre', region_id: 1 },
      { id: 20, name: 'Distrito Girardot', region_id: 2 }
    ];
    const mockGroups = [
      { id: 101, name: 'Grupo San Luis', district_id: 10 },
      { id: 201, name: 'Grupo Maracay', district_id: 20 }
    ];
    const onUpdateMemberHierarchy = vi.fn();

    render(
      <Step2Verification
        {...defaultProps}
        verificationList={list}
        regions={mockRegions}
        districts={mockDistricts}
        groups={mockGroups}
        onUpdateMemberHierarchy={onUpdateMemberHierarchy}
      />
    );

    const editBtn = screen.getByLabelText(/Editar estructura scout de Ana Perez/i);
    fireEvent.click(editBtn);

    expect(screen.getByText('Asignar Estructura Scout')).toBeInTheDocument();
    const regionSelect = screen.getByLabelText(/^Región Scout$/i);
    const districtSelect = screen.getByLabelText(/^Distrito Scout$/i);
    const groupSelect = screen.getByLabelText(/^Grupo Scout$/i);

    expect(regionSelect).toHaveValue('1');
    expect(districtSelect).toHaveValue('10');
    expect(groupSelect).toHaveValue('101');

    // Change to Aragua
    fireEvent.change(regionSelect, { target: { value: '2' } });
    fireEvent.change(districtSelect, { target: { value: '20' } });
    fireEvent.change(groupSelect, { target: { value: '201' } });

    const saveBtn = screen.getByText('Guardar Cambios');
    fireEvent.click(saveBtn);

    expect(onUpdateMemberHierarchy).toHaveBeenCalledWith('29111222', {
      region_id: 2,
      district_id: 20,
      group_id: 201
    });
  });
});
