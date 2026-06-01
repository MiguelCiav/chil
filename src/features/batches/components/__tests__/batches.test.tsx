import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { NewBatchWizard } from '../NewBatchWizard';

// Mock the API calls
vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return {
    ...actual,
    getHierarchyData: vi.fn(async () => ({
      regions: [
        { id: 1, name: "Región Capital" },
        { id: 2, name: "Región Central" }
      ],
      districts: [
        { id: 10, name: "Distrito Sucre", region_id: 1 },
        { id: 20, name: "Distrito Valencia", region_id: 2 }
      ],
      groups: [
        { id: 100, name: "Grupo Scout San Luis", district_id: 10 },
        { id: 200, name: "Grupo Scout Cabriales", district_id: 20 }
      ]
    })),
    createBatch: vi.fn(async (params) => ({
      id: 123,
      name: params.name,
      region_id: params.region_id,
      district_id: params.district_id,
      group_id: params.group_id,
      created_at: new Date().toISOString()
    }))
  };
});

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('NewBatchWizard - Step 1 (Organización)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Step 1 fields and hierarchy lists', async () => {
    render(
      <BrowserRouter>
        <NewBatchWizard />
      </BrowserRouter>
    );

    // Verify Title
    expect(screen.getByText('Configuración del Lote')).toBeInTheDocument();

    // Verify Fields exist
    expect(screen.getByLabelText(/Nombre del Lote/i)).toBeInTheDocument();
    
    // Wait for hierarchy to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Región Scout/i)).not.toBeDisabled();
    });

    const regionSelect = screen.getByLabelText(/Región Scout/i);
    expect(regionSelect).toBeInTheDocument();
    expect(screen.getByLabelText(/Distrito Scout/i)).toBeDisabled();
    expect(screen.getByLabelText(/Grupo Scout/i)).toBeDisabled();
  });

  it('filters districts based on selected region', async () => {
    render(
      <BrowserRouter>
        <NewBatchWizard />
      </BrowserRouter>
    );

    // Wait for hierarchy to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Región Scout/i)).not.toBeDisabled();
    });

    const regionSelect = screen.getByLabelText(/Región Scout/i);
    const districtSelect = screen.getByLabelText(/Distrito Scout/i);

    // Open Region Modal
    fireEvent.click(regionSelect);

    // Region Capital option should be present in the modal
    const regionOption = await screen.findByText('Región Capital');
    expect(regionOption).toBeInTheDocument();

    // Select Region Capital
    fireEvent.click(regionOption);

    // District select should be enabled
    await waitFor(() => {
      expect(districtSelect).not.toBeDisabled();
    });
    
    // Open District Modal
    fireEvent.click(districtSelect);

    // Distrito Sucre should be present
    const districtOption = await screen.findByText('Distrito Sucre');
    expect(districtOption).toBeInTheDocument();

    // Distrito Valencia (region 2) should NOT be present
    expect(screen.queryByText('Distrito Valencia')).not.toBeInTheDocument();
  });

  it('validates the form fields correctly', async () => {
    render(
      <BrowserRouter>
        <NewBatchWizard />
      </BrowserRouter>
    );

    // Wait for hierarchy to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Región Scout/i)).not.toBeDisabled();
    });

    const nameInput = screen.getByLabelText(/Nombre del Lote/i);
    const submitBtn = screen.getByText('Siguiente paso');

    // Button should be disabled initially
    expect(submitBtn).toBeDisabled();

    // Fill name with too short text
    fireEvent.change(nameInput, { target: { value: 'Lo' } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText('El nombre del lote debe tener al menos 3 caracteres')).toBeInTheDocument();
    });
  });
});
