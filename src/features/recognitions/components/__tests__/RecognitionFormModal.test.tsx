import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecognitionFormModal } from '../RecognitionFormModal';
import * as api from '../../api';
import { RecognitionType } from '../../types';

vi.mock('../../api', () => ({
  createRecognitionType: vi.fn(),
  updateRecognitionType: vi.fn()
}));

describe('RecognitionFormModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRecognition: RecognitionType = {
    id: 'sct-wood-badge',
    name: 'Insignia de Madera',
    created_at: '2026-08-20T10:00:00.000Z'
  };

  it('renders creation mode when no recognition is provided', () => {
    render(
      <RecognitionFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Nuevo Tipo de Reconocimiento')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ej\. Medalla al Mérito Scout/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /^Crear Reconocimiento$/i })).toBeInTheDocument();
  });

  it('renders edit mode when recognition is provided and pre-populates name', () => {
    render(
      <RecognitionFormModal
        isOpen={true}
        onClose={vi.fn()}
        recognition={mockRecognition}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Editar Tipo de Reconocimiento')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ej\. Medalla al Mérito Scout/i)).toHaveValue('Insignia de Madera');
    expect(screen.getByRole('button', { name: /^Guardar Cambios$/i })).toBeInTheDocument();
  });

  it('submits new recognition in create mode and triggers onSuccess and onClose', async () => {
    const createdResult: RecognitionType = {
      id: 'sct-orden-del-sol',
      name: 'Orden del Sol',
      created_at: '2026-08-22T00:00:00.000Z'
    };
    vi.mocked(api.createRecognitionType).mockResolvedValueOnce(createdResult);
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <RecognitionFormModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    const input = screen.getByPlaceholderText(/Ej\. Medalla al Mérito Scout/i);
    fireEvent.change(input, { target: { value: 'Orden del Sol' } });

    const submitBtn = screen.getByRole('button', { name: /^Crear Reconocimiento$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createRecognitionType).toHaveBeenCalledWith({ name: 'Orden del Sol' });
      expect(handleSuccess).toHaveBeenCalledWith(createdResult, false);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('submits updated recognition in edit mode and triggers onSuccess and onClose', async () => {
    const updatedResult: RecognitionType = {
      id: 'sct-wood-badge',
      name: 'Insignia de Madera 4 Maderos',
      created_at: '2026-08-20T10:00:00.000Z'
    };
    vi.mocked(api.updateRecognitionType).mockResolvedValueOnce(updatedResult);
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <RecognitionFormModal
        isOpen={true}
        onClose={handleClose}
        recognition={mockRecognition}
        onSuccess={handleSuccess}
      />
    );

    const input = screen.getByPlaceholderText(/Ej\. Medalla al Mérito Scout/i);
    fireEvent.change(input, { target: { value: 'Insignia de Madera 4 Maderos' } });

    const submitBtn = screen.getByRole('button', { name: /^Guardar Cambios$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.updateRecognitionType).toHaveBeenCalledWith('sct-wood-badge', {
        name: 'Insignia de Madera 4 Maderos'
      });
      expect(handleSuccess).toHaveBeenCalledWith(updatedResult, true);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('displays API error message when creation fails', async () => {
    vi.mocked(api.createRecognitionType).mockRejectedValueOnce(new Error('Creation failed'));
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <RecognitionFormModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    const input = screen.getByPlaceholderText(/Ej\. Medalla al Mérito Scout/i);
    fireEvent.change(input, { target: { value: 'Insignia Fallida' } });

    const submitBtn = screen.getByRole('button', { name: /^Crear Reconocimiento$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createRecognitionType).toHaveBeenCalledWith({ name: 'Insignia Fallida' });
      expect(screen.getByText(/Ocurrió un error al guardar el reconocimiento/i)).toBeInTheDocument();
      expect(handleSuccess).not.toHaveBeenCalled();
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  it('displays API error message when update fails', async () => {
    vi.mocked(api.updateRecognitionType).mockRejectedValueOnce(new Error('Update failed'));
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <RecognitionFormModal
        isOpen={true}
        onClose={handleClose}
        recognition={mockRecognition}
        onSuccess={handleSuccess}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /^Guardar Cambios$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.updateRecognitionType).toHaveBeenCalled();
      expect(screen.getByText(/Ocurrió un error al guardar el reconocimiento/i)).toBeInTheDocument();
      expect(handleSuccess).not.toHaveBeenCalled();
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  it('shows validation error when name is empty or invalid on submit', async () => {
    render(
      <RecognitionFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /^Crear Reconocimiento$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/El nombre debe tener al menos 2 caracteres/i)).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel or close button is clicked', () => {
    const handleClose = vi.fn();

    render(
      <RecognitionFormModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /^Cancelar$/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeHeaderBtn = screen.getByRole('button', { name: /Cerrar modal/i });
    fireEvent.click(closeHeaderBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
