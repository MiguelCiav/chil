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
    expect(screen.getByLabelText(/Generar automáticamente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ingreso manual/i)).toBeInTheDocument();
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
});

