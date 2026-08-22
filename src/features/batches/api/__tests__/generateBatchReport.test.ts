import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateBatchReport } from '../index';
import * as firestore from 'firebase/firestore';

const mockDocInstance = {
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  setDrawColor: vi.fn(),
  line: vi.fn(),
  setFont: vi.fn(),
  setFillColor: vi.fn(),
  rect: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn()
};

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    writeBatch: vi.fn(),
    deleteDoc: vi.fn()
  };
});

vi.mock('firebase/functions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/functions')>();
  return {
    ...actual,
    getFunctions: vi.fn(() => ({}))
  };
});

vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation(function () {
      return mockDocInstance;
    })
  };
});

describe('generateBatchReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws an error when batch is not found', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => false,
      data: () => null
    } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);

    await expect(generateBatchReport(999)).rejects.toThrow('Lote no encontrado');
  });

  it('includes both active and inactive/pending members in the PDF report', async () => {
    // 1. Mock getBatchById
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: 12345,
        comment: 'Lote de prueba',
        region_id: 1,
        district_id: 10,
        group_id: 100,
        created_at: '2026-08-21T12:00:00.000Z'
      })
    } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);

    // 2. Mock getMembersByBatchId
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      forEach: (cb: (doc: { data: () => unknown }) => void) => {
        const members = [
          {
            identity: 'V-11111111',
            first_names: 'Ana',
            last_names: 'Perez',
            birth_date: '2005-01-01',
            member_type: 'young',
            status: 'active',
            batch_id: 12345
          },
          {
            identity: 'V-22222222',
            first_names: 'Carlos',
            last_names: 'Gomez',
            birth_date: '2000-05-15',
            member_type: 'adult',
            status: 'pending',
            batch_id: 12345
          }
        ];
        members.forEach(m => cb({ data: () => m }));
      }
    } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

    // 3. Mock getHierarchyData (3 parallel getDocs: regions, districts, groups)
    vi.mocked(firestore.getDocs)
      .mockResolvedValueOnce({
        docs: [{ data: () => ({ id: 1, name: 'Región Capital' }) }]
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>)
      .mockResolvedValueOnce({
        docs: [{ data: () => ({ id: 10, name: 'Distrito Sucre', region_id: 1 }) }]
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>)
      .mockResolvedValueOnce({
        docs: [{ data: () => ({ id: 100, name: 'Grupo San Luis', district_id: 10 }) }]
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

    const resultFileName = await generateBatchReport(12345);

    expect(resultFileName).toBe('Reporte_Lote_12345.pdf');

    // Check that save was called with the expected file name
    expect(mockDocInstance.save).toHaveBeenCalledWith('Reporte_Lote_12345.pdf');

    // Check that summary metrics include both active and pending counts
    expect(mockDocInstance.text).toHaveBeenCalledWith('Total Miembros: 2', 14, 84);
    expect(mockDocInstance.text).toHaveBeenCalledWith('Miembros Activos (Válidos): 1', 70, 84);
    expect(mockDocInstance.text).toHaveBeenCalledWith('Miembros Pendientes (No Registrados): 1', 130, 84);

    // Check that table rows include BOTH members
    expect(mockDocInstance.text).toHaveBeenCalledWith('V-11111111', 16, expect.any(Number));
    expect(mockDocInstance.text).toHaveBeenCalledWith('Ana Perez', 46, expect.any(Number));
    expect(mockDocInstance.text).toHaveBeenCalledWith('Registro Válido', 146, expect.any(Number));

    expect(mockDocInstance.text).toHaveBeenCalledWith('V-22222222', 16, expect.any(Number));
    expect(mockDocInstance.text).toHaveBeenCalledWith('Carlos Gomez', 46, expect.any(Number));
    expect(mockDocInstance.text).toHaveBeenCalledWith('No registrado', 146, expect.any(Number));

    // Check that green and red colors were set for active and inactive status
    expect(mockDocInstance.setTextColor).toHaveBeenCalledWith(40, 167, 69);
    expect(mockDocInstance.setTextColor).toHaveBeenCalledWith(220, 53, 69);
  });
});
