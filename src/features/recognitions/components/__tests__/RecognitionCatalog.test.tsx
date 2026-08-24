import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecognitionCatalog } from '../RecognitionCatalog';
import * as api from '../../api';
import { RecognitionType } from '../../types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

vi.mock('../../api', () => ({
  getAllRecognitionTypes: vi.fn(),
  getRecognitionTypeById: vi.fn(),
  createRecognitionType: vi.fn(),
  updateRecognitionType: vi.fn(),
  deleteRecognitionType: vi.fn()
}));

const mockRecognitions: RecognitionType[] = [
  {
    id: 'sct-wood-badge',
    name: 'Insignia de Madera',
    created_at: '2026-01-15T10:00:00.000Z'
  },
  {
    id: 'sct-promesa',
    name: 'Promesa Scout',
    created_at: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'sct-plastic-tide',
    name: 'Embajadores de la Marea de Plástico',
    created_at: '2026-03-01T14:00:00.000Z'
  }
];

describe('RecognitionCatalog component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, actions, and loads recognitions into TanStack table', async () => {
    vi.mocked(api.getAllRecognitionTypes).mockResolvedValue(mockRecognitions);

    render(<RecognitionCatalog />);

    expect(screen.getByText('Tipos de Reconocimiento')).toBeInTheDocument();
    expect(screen.getByText('Nuevo Reconocimiento')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Insignia de Madera')).toBeInTheDocument();
      expect(screen.getByText('Promesa Scout')).toBeInTheDocument();
      expect(screen.getByText('Embajadores de la Marea de Plástico')).toBeInTheDocument();
    });

    expect(screen.getByText('sct-wood-badge')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Fecha de Creación')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });

  it('filters recognitions by global search input', async () => {
    vi.mocked(api.getAllRecognitionTypes).mockResolvedValue(mockRecognitions);

    render(<RecognitionCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Insignia de Madera')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Buscar reconocimiento...');
    fireEvent.change(searchInput, { target: { value: 'Madera' } });

    expect(screen.getByText('Insignia de Madera')).toBeInTheDocument();
    expect(screen.queryByText('Promesa Scout')).not.toBeInTheDocument();
    expect(screen.queryByText('Embajadores de la Marea de Plástico')).not.toBeInTheDocument();

    // Clear search
    const clearBtn = screen.getByLabelText('Limpiar búsqueda');
    fireEvent.click(clearBtn);

    expect(screen.getByText('Insignia de Madera')).toBeInTheDocument();
    expect(screen.getByText('Promesa Scout')).toBeInTheDocument();
  });

  it('opens create modal, validates and creates a new recognition type', async () => {
    vi.mocked(api.getAllRecognitionTypes).mockResolvedValue(mockRecognitions);
    const newCreated: RecognitionType = {
      id: 'sct-medalla-al-valor',
      name: 'Medalla al Valor',
      created_at: '2026-04-01T00:00:00.000Z'
    };
    vi.mocked(api.createRecognitionType).mockResolvedValue(newCreated);

    render(<RecognitionCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Insignia de Madera')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /Nuevo Reconocimiento/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('Nuevo Tipo de Reconocimiento')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Nombre \*/i);
    fireEvent.change(nameInput, { target: { value: 'Medalla al Valor' } });

    const submitBtn = screen.getByRole('button', { name: 'Crear Reconocimiento' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createRecognitionType).toHaveBeenCalledWith({
        name: 'Medalla al Valor'
      });
      expect(screen.getByText('Medalla al Valor')).toBeInTheDocument();
      expect(screen.getByText(/creado exitosamente/i)).toBeInTheDocument();
    });
  });

  it('opens edit modal and updates an existing recognition', async () => {
    vi.mocked(api.getAllRecognitionTypes).mockResolvedValue(mockRecognitions);
    const updatedRecognition: RecognitionType = {
      id: 'sct-wood-badge',
      name: 'Insignia de Madera (Avanzada)',
      created_at: '2026-01-15T10:00:00.000Z'
    };
    vi.mocked(api.updateRecognitionType).mockResolvedValue(updatedRecognition);

    render(<RecognitionCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Insignia de Madera')).toBeInTheDocument();
    });

    const editBtn = screen.getByLabelText('Editar Insignia de Madera');
    fireEvent.click(editBtn);

    expect(screen.getByText('Editar Tipo de Reconocimiento')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Nombre \*/i);
    fireEvent.change(nameInput, { target: { value: 'Insignia de Madera (Avanzada)' } });

    const saveChangesBtn = screen.getByRole('button', { name: 'Guardar Cambios' });
    fireEvent.click(saveChangesBtn);

    await waitFor(() => {
      expect(api.updateRecognitionType).toHaveBeenCalledWith('sct-wood-badge', {
        name: 'Insignia de Madera (Avanzada)'
      });
      expect(screen.getByText('Insignia de Madera (Avanzada)')).toBeInTheDocument();
      expect(screen.getByText(/actualizado exitosamente/i)).toBeInTheDocument();
    });
  });

  it('opens delete confirmation modal and removes recognition from table', async () => {
    vi.mocked(api.getAllRecognitionTypes).mockResolvedValue(mockRecognitions);
    vi.mocked(api.deleteRecognitionType).mockResolvedValue();

    render(<RecognitionCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Promesa Scout')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByLabelText('Eliminar Promesa Scout');
    fireEvent.click(deleteBtn);

    expect(screen.getByText('Eliminar Tipo de Reconocimiento')).toBeInTheDocument();
    expect(screen.getByText(/¿Está seguro de que desea eliminar este reconocimiento\?/i)).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Eliminar Reconocimiento' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.deleteRecognitionType).toHaveBeenCalledWith('sct-promesa');
      expect(screen.queryByText('Promesa Scout')).not.toBeInTheDocument();
      expect(screen.getByText(/eliminado exitosamente/i)).toBeInTheDocument();
    });
  });

  it('navigates to certificate designer on clicking Plantilla button', async () => {
    vi.mocked(api.getAllRecognitionTypes).mockResolvedValue(mockRecognitions);

    render(<RecognitionCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Insignia de Madera')).toBeInTheDocument();
    });

    const plantillaBtn = screen.getByLabelText('Diseñar plantilla para Insignia de Madera');
    fireEvent.click(plantillaBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/reconocimientos/sct-wood-badge/plantilla');
  });

  it('renders clean empty state with button to create when recognitions list is empty', async () => {
    vi.mocked(api.getAllRecognitionTypes).mockResolvedValue([]);

    render(<RecognitionCatalog />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'No hay tipos de reconocimiento registrados' })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Haga clic en 'Nuevo Reconocimiento' para comenzar/i)
    ).toBeInTheDocument();

    const emptyCreateBtn = screen.getAllByRole('button', { name: /Nuevo Reconocimiento/i })[1];
    fireEvent.click(emptyCreateBtn);

    expect(screen.getByText('Nuevo Tipo de Reconocimiento')).toBeInTheDocument();
  });
});

