import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MergeBatchesModal, BatchMergeOption } from '../MergeBatchesModal';
import * as api from '../../../api';
import { Batch } from '../../../types';

vi.mock('../../../api', () => ({
  mergeBatches: vi.fn()
}));

describe('MergeBatchesModal component', () => {
  const mockBatches: BatchMergeOption[] = [
    {
      id: 101,
      batch: {
        id: 101,
        comment: 'Lote Scouts 1',
        region_id: 1,
        district_id: 10,
        group_id: 100,
        recognition_type: 'sct-wood-badge',
        created_at: '2026-08-01T10:00:00.000Z'
      },
      created_at: '2026-08-01T10:00:00.000Z',
      formattedDate: '01 ago. 2026',
      groupName: 'Grupo San Luis',
      recognitionName: 'Insignia de Madera',
      memberCount: 3
    },
    {
      id: 102,
      batch: {
        id: 102,
        comment: 'Lote Scouts 2',
        region_id: 1,
        district_id: 10,
        group_id: 100,
        recognition_type: 'sct-wood-badge',
        created_at: '2026-08-15T15:00:00.000Z'
      },
      created_at: '2026-08-15T15:00:00.000Z',
      formattedDate: '15 ago. 2026',
      groupName: 'Grupo San Luis',
      recognitionName: 'Insignia de Madera',
      memberCount: 5
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with selected batches, combined count and preview metrics', () => {
    render(
      <MergeBatchesModal
        isOpen={true}
        onClose={vi.fn()}
        selectedBatches={mockBatches}
        onMergeSuccess={vi.fn()}
        userId="user-123"
      />
    );

    expect(screen.getByText('Fusionar Lotes Seleccionados')).toBeInTheDocument();
    expect(screen.getByText('Lote #101')).toBeInTheDocument();
    expect(screen.getByText('Lote #102')).toBeInTheDocument();
    expect(screen.getByText('3 miembros')).toBeInTheDocument();
    expect(screen.getByText('5 miembros')).toBeInTheDocument();

    // Combined members: 3 + 5 = 8
    expect(screen.getByText('8 miembros')).toBeInTheDocument();

    // Newest date: 15 ago. 2026 appears in list and in preview summary
    expect(screen.getAllByText('15 ago. 2026').length).toBeGreaterThanOrEqual(1);

    // Shared group: Grupo San Luis appears in list and preview summary
    expect(screen.getAllByText('Grupo San Luis').length).toBeGreaterThanOrEqual(1);

    // Shared recognition: Insignia de Madera appears in list and preview summary
    expect(screen.getAllByText('Insignia de Madera').length).toBeGreaterThanOrEqual(1);
  });

  it('displays Multigrupo and combined recognition when batches differ', () => {
    const differingBatches: BatchMergeOption[] = [
      {
        ...mockBatches[0],
        groupName: 'Grupo 1',
        recognitionName: 'Insignia de Madera',
        batch: { ...mockBatches[0].batch, group_id: 1, recognition_type: 'sct-wood-badge' }
      },
      {
        ...mockBatches[1],
        groupName: 'Grupo 2',
        recognitionName: 'Go Solar',
        batch: { ...mockBatches[1].batch, group_id: 2, recognition_type: 'sct-go-solar' }
      }
    ];

    render(
      <MergeBatchesModal
        isOpen={true}
        onClose={vi.fn()}
        selectedBatches={differingBatches}
        onMergeSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Multigrupo')).toBeInTheDocument();
    expect(screen.getByText('Insignia de Madera (combinado)')).toBeInTheDocument();
  });

  it('calls mergeBatches and triggers onMergeSuccess on successful form submission', async () => {
    const onMergeSuccessMock = vi.fn();
    const onCloseMock = vi.fn();

    const mergedBatchResult: Batch = {
      id: 9999,
      comment: 'Fusión final',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'sct-wood-badge',
      created_at: '2026-08-15T15:00:00.000Z',
      user_id: 'user-123'
    };

    vi.mocked(api.mergeBatches).mockResolvedValueOnce(mergedBatchResult);

    render(
      <MergeBatchesModal
        isOpen={true}
        onClose={onCloseMock}
        selectedBatches={mockBatches}
        onMergeSuccess={onMergeSuccessMock}
        userId="user-123"
      />
    );

    const commentInput = screen.getByPlaceholderText(/Ej.: Lote fusionado correspondiente/i);
    fireEvent.change(commentInput, { target: { value: 'Fusión final' } });

    const submitBtn = screen.getByRole('button', { name: /Fusionar lotes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.mergeBatches).toHaveBeenCalledWith(
        {
          batchIds: [101, 102],
          newComment: 'Fusión final',
          user_id: 'user-123'
        },
        'user-123'
      );
      expect(onMergeSuccessMock).toHaveBeenCalledWith(mergedBatchResult);
    });
  });

  it('displays error alert when mergeBatches fails', async () => {
    vi.mocked(api.mergeBatches).mockRejectedValueOnce(new Error('Falla en Firestore'));

    render(
      <MergeBatchesModal
        isOpen={true}
        onClose={vi.fn()}
        selectedBatches={mockBatches}
        onMergeSuccess={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Fusionar lotes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Falla en Firestore')).toBeInTheDocument();
    });
  });

  it('calls onClose when Cancelar button is clicked', () => {
    const onCloseMock = vi.fn();
    render(
      <MergeBatchesModal
        isOpen={true}
        onClose={onCloseMock}
        selectedBatches={mockBatches}
        onMergeSuccess={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onCloseMock).toHaveBeenCalled();
  });
});
