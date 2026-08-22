import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Step3Review } from '../wizard/Step3Review';
import { ScoutMember } from '../../types';
import * as api from '../../api';

vi.mock('../../api', () => ({
  updateMember: vi.fn(),
  getMembersByBatchId: vi.fn()
}));

describe('Step3Review component', () => {
  const sampleMembers: ScoutMember[] = [
    {
      identity: 'V-11111111',
      first_names: 'Ana',
      last_names: 'Perez',
      birth_date: '2005-01-01',
      member_type: 'young',
      status: 'active',
      batch_id: 123
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

  it('switches between Valid and Pending tabs', () => {
    render(<Step3Review {...defaultProps} />);

    // Click Pending tab
    const pendingTab = screen.getByText('Registros Pendientes');
    fireEvent.click(pendingTab);

    expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();
    expect(screen.queryByText('Ana Perez')).not.toBeInTheDocument();
  });

  it('filters members by search query', () => {
    render(<Step3Review {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Buscar por nombre o cédula...');
    fireEvent.change(searchInput, { target: { value: '999999' } });

    expect(screen.getByText('No se encontraron miembros en esta categoría.')).toBeInTheDocument();
  });

  it('opens member edit modal, submits update and closes modal', async () => {
    vi.mocked(api.updateMember).mockResolvedValueOnce(sampleMembers[0]);
    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce(sampleMembers);

    render(<Step3Review {...defaultProps} />);

    // Click edit button on first member
    const editBtns = screen.getAllByRole('button');
    const editBtn = editBtns.find(b => b.querySelector('svg.lucide-edit-2') || b.querySelector('svg'));
    if (editBtn) fireEvent.click(editBtn);

    expect(screen.getByText('Editar Información de Miembro')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Nombres \*/i);
    fireEvent.change(nameInput, { target: { value: 'Ana Maria' } });

    const saveBtn = screen.getByText('Guardar Cambios');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateMember).toHaveBeenCalled();
      expect(defaultProps.onMembersUpdated).toHaveBeenCalled();
    });
  });

  it('handles Back and Finalize buttons', () => {
    render(<Step3Review {...defaultProps} />);

    const backBtn = screen.getByText('Atrás');
    fireEvent.click(backBtn);
    expect(defaultProps.onBack).toHaveBeenCalled();

    const finalizeBtn = screen.getByText('Generar Lote');
    fireEvent.click(finalizeBtn);
    expect(defaultProps.handleFinalizeBatch).toHaveBeenCalled();
  });
});
