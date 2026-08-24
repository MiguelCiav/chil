import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecognitionDeleteModal } from '../RecognitionDeleteModal';
import * as api from '../../api';
import { RecognitionType } from '../../types';

vi.mock('../../api', () => ({
  deleteRecognitionType: vi.fn()
}));

describe('RecognitionDeleteModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRecognition: RecognitionType = {
    id: 'sct-wood-badge',
    name: 'Insignia de Madera',
    created_at: '2026-08-20T10:00:00.000Z'
  };

  it('renders nothing when recognition is null', () => {
    const { container } = render(
      <RecognitionDeleteModal
        isOpen={true}
        onClose={vi.fn()}
        recognition={null}
        onSuccess={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal with recognition details when open', () => {
    render(
      <RecognitionDeleteModal
        isOpen={true}
        onClose={vi.fn()}
        recognition={mockRecognition}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Eliminar Tipo de Reconocimiento')).toBeInTheDocument();
    expect(screen.getByText('Insignia de Madera')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancelar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Eliminar Reconocimiento$/i })).toBeInTheDocument();
  });

  it('calls deleteRecognitionType and onSuccess on confirm, then closes modal', async () => {
    vi.mocked(api.deleteRecognitionType).mockResolvedValueOnce();
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <RecognitionDeleteModal
        isOpen={true}
        onClose={handleClose}
        recognition={mockRecognition}
        onSuccess={handleSuccess}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /^Eliminar Reconocimiento$/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.deleteRecognitionType).toHaveBeenCalledWith('sct-wood-badge');
      expect(handleSuccess).toHaveBeenCalledWith('sct-wood-badge');
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('displays error message when deleteRecognitionType fails and keeps modal open', async () => {
    vi.mocked(api.deleteRecognitionType).mockRejectedValueOnce(new Error('Deletion failed'));
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <RecognitionDeleteModal
        isOpen={true}
        onClose={handleClose}
        recognition={mockRecognition}
        onSuccess={handleSuccess}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /^Eliminar Reconocimiento$/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.deleteRecognitionType).toHaveBeenCalledWith('sct-wood-badge');
      expect(screen.getByText(/Ocurrió un error al eliminar el reconocimiento/i)).toBeInTheDocument();
      expect(handleSuccess).not.toHaveBeenCalled();
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  it('closes modal when cancel button or close icon is clicked', () => {
    const handleClose = vi.fn();

    render(
      <RecognitionDeleteModal
        isOpen={true}
        onClose={handleClose}
        recognition={mockRecognition}
        onSuccess={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /^Cancelar$/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeHeaderBtn = screen.getByRole('button', { name: /Cerrar modal/i });
    fireEvent.click(closeHeaderBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);

    const backdrop = screen.getByRole('presentation');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(backdrop, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(4);
  });
});
