import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Step3Review } from '../wizard/Step3Review';
import { ScoutMember } from '../../types';
import * as api from '../../api';

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return {
    ...actual,
    updateMember: vi.fn(),
    getMembersByBatchId: vi.fn()
  };
});

describe('Step3Review component', () => {
  const sampleMembers: ScoutMember[] = [
    {
      identity: 'V-11111111',
      first_names: 'Ana',
      last_names: 'Perez',
      birth_date: '2005-01-01',
      member_type: 'young',
      status: 'active',
      batch_id: 123,
      recognition_code: 'REC-A8F2'
    },
    {
      identity: 'V-22222222',
      first_names: 'Carlos',
      last_names: 'Gomez',
      birth_date: '1990-05-15',
      member_type: 'adult',
      status: 'pending',
      batch_id: 123
    }
  ];

  const defaultProps = {
    batchId: 123,
    savedMembers: sampleMembers,
    onMembersUpdated: vi.fn(),
    handleFinalizeBatch: vi.fn(),
    onBack: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders summary statistics and active members list by default', () => {
    render(<Step3Review {...defaultProps} />);

    expect(screen.getByText('Revisión Final del Lote')).toBeInTheDocument();
    expect(screen.getByText('Total: 2')).toBeInTheDocument();
    expect(screen.getByText('Jóvenes: 1')).toBeInTheDocument();
    expect(screen.getByText('Adultos: 1')).toBeInTheDocument();

    // Default tab is 'valid'
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Gomez')).not.toBeInTheDocument();
  });

  it('renders the Códigos de Reconocimiento control bar with options', () => {
    render(<Step3Review {...defaultProps} />);

    expect(screen.getByText('Códigos de Reconocimiento')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Generar códigos automáticamente/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Ingreso manual/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Regenerar códigos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Limpiar códigos/i })).toBeInTheDocument();
  });

  it('auto-assigns recognition codes on mount if active members do not have codes', () => {
    const unassignedMembers: ScoutMember[] = [
      {
        identity: 'V-11111111',
        first_names: 'Ana',
        last_names: 'Perez',
        birth_date: '2005-01-01',
        member_type: 'young',
        status: 'active',
        batch_id: 123
      }
    ];
    const onUpdated = vi.fn();

    render(
      <Step3Review
        {...defaultProps}
        savedMembers={unassignedMembers}
        onMembersUpdated={onUpdated}
      />
    );

    expect(onUpdated).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          identity: 'V-11111111',
          recognition_code: expect.stringMatching(/^REC-[A-Z2-9]{6}$/)
        })
      ])
    );
  });

  it('regenerates recognition codes when clicking Regenerar códigos button', () => {
    render(<Step3Review {...defaultProps} />);

    const regenBtn = screen.getByRole('button', { name: /Regenerar códigos/i });
    fireEvent.click(regenBtn);

    expect(defaultProps.onMembersUpdated).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          identity: 'V-11111111',
          recognition_code: expect.stringMatching(/^REC-[A-Z2-9]{6}$/)
        })
      ])
    );
  });

  it('clears recognition codes when clicking Limpiar códigos button', () => {
    render(<Step3Review {...defaultProps} />);

    const clearBtn = screen.getByRole('button', { name: /Limpiar códigos/i });
    fireEvent.click(clearBtn);

    expect(defaultProps.onMembersUpdated).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          identity: 'V-11111111',
          recognition_code: ''
        })
      ])
    );
  });

  it('switches between Valid and Pending tabs', () => {
    render(<Step3Review {...defaultProps} />);

    // Click Pending tab
    const pendingTab = screen.getByText('Registros Pendientes');
    fireEvent.click(pendingTab);

    expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();
    expect(screen.queryByText('Ana Perez')).not.toBeInTheDocument();
  });

  it('filters members by search query including recognition code', () => {
    render(<Step3Review {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Buscar por nombre o cédula...');
    fireEvent.change(searchInput, { target: { value: 'REC-A8F2' } });

    expect(screen.getByText('Ana Perez')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'NONEXISTENT' } });
    expect(screen.getByText('No se encontraron miembros en esta categoría.')).toBeInTheDocument();
  });

  it('allows inline editing of recognition code directly in member row', () => {
    render(<Step3Review {...defaultProps} />);

    const codeInput = screen.getByLabelText(/Código de reconocimiento de Ana Perez/i);
    expect(codeInput).toHaveValue('REC-A8F2');

    fireEvent.change(codeInput, { target: { value: 'REC-CUSTOM-001' } });

    expect(defaultProps.onMembersUpdated).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          identity: 'V-11111111',
          recognition_code: 'REC-CUSTOM-001'
        })
      ])
    );
  });

  it('opens member edit modal, modifies names and recognition code, submits update and closes modal', async () => {
    vi.mocked(api.updateMember).mockResolvedValueOnce(sampleMembers[0]);
    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce(sampleMembers);

    render(<Step3Review {...defaultProps} />);

    // Click edit button on first member
    const editBtn = screen.getByLabelText(/Editar información de Ana Perez/i);
    fireEvent.click(editBtn);

    expect(screen.getByText('Editar Información de Miembro')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Nombres \*/i);
    fireEvent.change(nameInput, { target: { value: 'Ana Maria' } });

    const codeModalInput = screen.getByLabelText(/^Código de Reconocimiento$/i);
    fireEvent.change(codeModalInput, { target: { value: 'REC-MODAL-99' } });

    const saveBtn = screen.getByText('Guardar Cambios');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateMember).toHaveBeenCalledWith(
        expect.objectContaining({
          first_names: 'Ana Maria',
          recognition_code: 'REC-MODAL-99'
        })
      );
      expect(defaultProps.onMembersUpdated).toHaveBeenCalled();
    });
  });

  it('commits all member documents to Firestore and calls handleFinalizeBatch on Generar Lote', async () => {
    vi.mocked(api.updateMember).mockResolvedValue(sampleMembers[0]);

    render(<Step3Review {...defaultProps} />);

    const finalizeBtn = screen.getByText('Generar Lote');
    fireEvent.click(finalizeBtn);

    await waitFor(() => {
      expect(api.updateMember).toHaveBeenCalledTimes(sampleMembers.length);
      expect(defaultProps.handleFinalizeBatch).toHaveBeenCalled();
    });
  });

  it('handles Back button click', () => {
    render(<Step3Review {...defaultProps} />);

    const backBtn = screen.getByText('Atrás');
    fireEvent.click(backBtn);
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('displays exceptional members in valid tab with Excepcional badge and code editing', () => {
    const membersWithExceptional: ScoutMember[] = [
      {
        identity: 'V-33333333',
        first_names: 'Luis',
        last_names: 'Exceptional',
        birth_date: '2004-03-01',
        member_type: 'young',
        status: 'exceptional',
        batch_id: 123,
        recognition_code: 'REC-EXC-33'
      }
    ];

    render(
      <Step3Review
        {...defaultProps}
        savedMembers={membersWithExceptional}
      />
    );

    // Active tab includes exceptional members
    expect(screen.getByText('Luis Exceptional')).toBeInTheDocument();
    expect(screen.getByText('Excepcional')).toBeInTheDocument();
    expect(screen.getByLabelText(/Código de reconocimiento de Luis Exceptional/i)).toHaveValue('REC-EXC-33');
  });

  it('allows authorizing exceptional recognition for pending member in Step3Review modal', async () => {
    const pendingMember: ScoutMember = {
      identity: 'V-44444444',
      first_names: 'Daniel',
      last_names: 'Suarez',
      birth_date: '1995-10-10',
      member_type: 'adult',
      status: 'pending',
      batch_id: 123
    };

    vi.mocked(api.updateMember).mockResolvedValueOnce({
      ...pendingMember,
      status: 'exceptional',
      recognition_code: 'REC-4444'
    });
    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([
      {
        ...pendingMember,
        status: 'exceptional',
        recognition_code: 'REC-4444'
      }
    ]);

    render(
      <Step3Review
        {...defaultProps}
        savedMembers={[pendingMember]}
      />
    );

    // Switch to Pending tab
    fireEvent.click(screen.getByText('Registros Pendientes'));

    expect(screen.getByText('Daniel Suarez')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();

    // Click edit
    fireEvent.click(screen.getByLabelText(/Editar información de Daniel Suarez/i));

    expect(screen.getByText('Editar Información de Miembro')).toBeInTheDocument();
    const toggle = screen.getByLabelText(/Autorizar emisión de reconocimiento \(Caso Excepcional\)/i);
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);
    expect(toggle).toBeChecked();

    const reasonInput = screen.getByLabelText(/Justificación de la emisión excepcional/i);
    fireEvent.change(reasonInput, { target: { value: 'Comprobante presentado' } });

    fireEvent.click(screen.getByText('Guardar Cambios'));

    await waitFor(() => {
      expect(api.updateMember).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: 'V-44444444',
          status: 'exceptional',
          exceptional_reason: 'Comprobante presentado',
          recognition_code: expect.stringMatching(/^REC-/)
        })
      );
    });
  });

  it('displays unit badge on member row and allows changing unit in edit modal', async () => {
    const memberWithUnit: ScoutMember = {
      identity: 'V-55555555',
      first_names: 'Valeria',
      last_names: 'Lobezna',
      birth_date: '2015-06-01',
      member_type: 'young',
      unit: 'manada',
      status: 'active',
      batch_id: 123,
      recognition_code: 'REC-MAN-01',
      verified_in_registry: true
    };

    vi.mocked(api.updateMember).mockResolvedValueOnce({
      ...memberWithUnit,
      unit: 'tropa'
    });
    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([
      {
        ...memberWithUnit,
        unit: 'tropa'
      }
    ]);

    render(
      <Step3Review
        {...defaultProps}
        savedMembers={[memberWithUnit]}
      />
    );

    expect(screen.getByText('Valeria Lobezna')).toBeInTheDocument();
    expect(screen.getByText('Manada')).toBeInTheDocument();

    // Open edit modal
    fireEvent.click(screen.getByLabelText(/Editar información de Valeria Lobezna/i));

    const unitSelect = screen.getByLabelText(/Unidad Scout \*/i);
    expect(unitSelect).toHaveValue('manada');

    fireEvent.change(unitSelect, { target: { value: 'tropa' } });
    expect(unitSelect).toHaveValue('tropa');

    fireEvent.click(screen.getByText('Guardar Cambios'));

    await waitFor(() => {
      expect(api.updateMember).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: 'V-55555555',
          unit: 'tropa'
        })
      );
    });
  });

  it('sets status to pending when changing unverified no_scout member to a scout unit in edit modal', async () => {
    const unverifiedNoScout: ScoutMember = {
      identity: 'V-77777777',
      first_names: 'Colaborador',
      last_names: 'Externo',
      birth_date: '1985-01-01',
      member_type: 'adult',
      unit: 'no_scout',
      status: 'active',
      verified_in_registry: false,
      batch_id: 123,
      recognition_code: 'REC-EXT-01'
    };

    vi.mocked(api.updateMember).mockResolvedValueOnce({
      ...unverifiedNoScout,
      unit: 'clan',
      status: 'pending'
    });
    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([
      {
        ...unverifiedNoScout,
        unit: 'clan',
        status: 'pending'
      }
    ]);

    render(
      <Step3Review
        {...defaultProps}
        savedMembers={[unverifiedNoScout]}
      />
    );

    // Open edit modal
    fireEvent.click(screen.getByLabelText(/Editar información de Colaborador Externo/i));

    const unitSelect = screen.getByLabelText(/Unidad Scout \*/i);
    expect(unitSelect).toHaveValue('no_scout');

    // Change to clan (scout unit)
    fireEvent.change(unitSelect, { target: { value: 'clan' } });

    // Status becomes pending, rendering the exceptional toggle
    await waitFor(() => {
      expect(screen.getByLabelText(/Autorizar emisión de reconocimiento \(Caso Excepcional\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Guardar Cambios'));

    await waitFor(() => {
      expect(api.updateMember).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: 'V-77777777',
          unit: 'clan',
          status: 'pending'
        })
      );
    });
  });
});

