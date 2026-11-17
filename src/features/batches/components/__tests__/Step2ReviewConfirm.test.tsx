import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Step2ReviewConfirm } from '../wizard/Step2ReviewConfirm';
import { ScoutMember } from '../../types';
import * as api from '../../api';

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return {
    ...actual,
    updateMember: vi.fn(),
    deleteMember: vi.fn(),
    batchUpdateMembers: vi.fn(),
    getMembersByBatchId: vi.fn(),
    assignBatchRecognitionCodes: vi.fn((members: Record<string, unknown>[], mode: string) =>
      members.map((m, idx: number) => ({
        ...m,
        recognition_code: mode === 'auto' ? `REC-${String(idx + 1).padStart(3, '0')}` : undefined
      }))
    )
  };
});

describe('Step2ReviewConfirm component', () => {
  const mockMembers: ScoutMember[] = [
    {
      identity: '29111222',
      first_names: 'Carlos',
      last_names: 'Gomez',
      birth_date: '2005-01-01',
      member_type: 'young',
      unit: 'caminantes',
      status: 'active',
      is_solvent: true,
      solvent_until: '2026-12-31',
      region_name: 'DISTRITO CAPITAL',
      district_name: 'AVILA',
      group_name: 'DON BOSCO 21',
      batch_id: 101,
      recognition_code: 'REC-001'
    },
    {
      identity: '12333444',
      first_names: 'Maria',
      last_names: 'Perez',
      birth_date: '1985-05-10',
      member_type: 'adult',
      unit: 'institucional',
      status: 'active',
      is_solvent: true,
      region_name: 'DISTRITO CAPITAL',
      district_name: 'AVILA',
      group_name: 'DON BOSCO 21',
      batch_id: 101,
      recognition_code: 'REC-002'
    },
    {
      identity: '99888777',
      first_names: 'Pedro',
      last_names: 'Sanchez',
      birth_date: '2010-02-02',
      member_type: 'young',
      unit: 'tropa',
      status: 'pending',
      batch_id: 101
    }
  ];

  const defaultProps = {
    batchId: 101,
    membersList: mockMembers,
    onMembersUpdated: vi.fn(),
    onBack: vi.fn(),
    onFinalizeBatch: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders summary statistics without Lote/Tipo subtitle and shows auto-detected member information', () => {
    render(<Step2ReviewConfirm {...defaultProps} />);

    expect(screen.getByText('Revisión y Confirmación del Lote')).toBeInTheDocument();
    expect(screen.queryByText(/Lote:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tipo:/i)).not.toBeInTheDocument();

    expect(screen.getByText('Total: 3')).toBeInTheDocument();
    expect(screen.getByText('Jóvenes: 2')).toBeInTheDocument();
    expect(screen.getByText('Adultos: 1')).toBeInTheDocument();

    expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();
    expect(screen.getByText('Maria Perez')).toBeInTheDocument();
    expect(screen.getByText('Pedro Sanchez')).toBeInTheDocument();

    expect(screen.getAllByText('DON BOSCO 21').length).toBeGreaterThan(0);
    expect(screen.getByText('Solvente hasta 2026-12-31')).toBeInTheDocument();
  });

  it('toggles code strategy and regenerates codes', () => {
    render(<Step2ReviewConfirm {...defaultProps} />);

    const manualModeBtn = screen.getByRole('button', { name: /Editar Códigos Manualmente/i });
    fireEvent.click(manualModeBtn);

    expect(screen.getByText(/Modo manual activo/i)).toBeInTheDocument();

    const autoModeBtn = screen.getByRole('button', { name: /Auto-Generar Códigos/i });
    fireEvent.click(autoModeBtn);

    const regenBtn = screen.getByRole('button', { name: /Regenerar/i });
    fireEvent.click(regenBtn);
    expect(api.assignBatchRecognitionCodes).toHaveBeenCalledWith(mockMembers, 'auto');
  });

  it('filters member rows by search input and tabs', () => {
    render(<Step2ReviewConfirm {...defaultProps} />);

    const searchInput = screen.getByLabelText(/Buscar por nombre, cédula o grupo/i);
    fireEvent.change(searchInput, { target: { value: 'Maria' } });

    expect(screen.getByText('Maria Perez')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Gomez')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '' } });

    // Switch to Pending tab
    const pendingTabBtn = screen.getByRole('button', { name: /Pendientes/i });
    fireEvent.click(pendingTabBtn);

    expect(screen.getByText('Pedro Sanchez')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Gomez')).not.toBeInTheDocument();
  });

  it('allows inline modification of recognition code', () => {
    render(<Step2ReviewConfirm {...defaultProps} />);

    const codeInput = screen.getByLabelText(/Código de reconocimiento de Carlos Gomez/i);
    fireEvent.change(codeInput, { target: { value: 'CUSTOM-999' } });

    expect(defaultProps.onMembersUpdated).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ identity: '29111222', recognition_code: 'CUSTOM-999' })
      ])
    );
  });

  it('uses standard Emitir Lote flow even when only 1 member is loaded (no PDF fast-path button)', async () => {
    const singleMemberProps = {
      ...defaultProps,
      membersList: [mockMembers[0]]
    };

    render(<Step2ReviewConfirm {...singleMemberProps} />);

    expect(
      screen.queryByRole('button', { name: /Emitir y Descargar PDF/i })
    ).not.toBeInTheDocument();

    const emitBtn = screen.getByRole('button', { name: /Emitir Lote/i });
    fireEvent.click(emitBtn);

    await waitFor(() => {
      expect(api.batchUpdateMembers).toHaveBeenCalledWith([mockMembers[0]]);
      expect(defaultProps.onFinalizeBatch).toHaveBeenCalled();
    });
  });

  it('finalizes batch and updates all members on Emitir Lote click', async () => {
    render(<Step2ReviewConfirm {...defaultProps} />);

    const finalizeBtn = screen.getByRole('button', { name: /Emitir Lote/i });
    fireEvent.click(finalizeBtn);

    await waitFor(() => {
      expect(api.batchUpdateMembers).toHaveBeenCalledWith(mockMembers);
      expect(defaultProps.onFinalizeBatch).toHaveBeenCalled();
    });
  });

  it('handles member deletion after user confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.deleteMember).mockResolvedValue();

    render(<Step2ReviewConfirm {...defaultProps} />);

    const deleteBtn = screen.getByLabelText(/Quitar a Pedro Sanchez/i);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.deleteMember).toHaveBeenCalledWith('99888777', '99888777', 101);
      expect(defaultProps.onMembersUpdated).toHaveBeenCalledWith([mockMembers[0], mockMembers[1]]);
    });
  });

  it('calls onBack when clicking back button', () => {
    render(<Step2ReviewConfirm {...defaultProps} />);

    const backBtn = screen.getByRole('button', { name: /Atrás \(Modificar Cédulas\)/i });
    fireEvent.click(backBtn);

    expect(defaultProps.onBack).toHaveBeenCalled();
  });
});
