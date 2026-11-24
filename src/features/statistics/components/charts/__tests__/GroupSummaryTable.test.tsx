import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GroupSummaryTable } from '../GroupSummaryTable';
import { GeographicItem, YoYComparisonData } from '../../../types';

describe('GroupSummaryTable Component', () => {
  const mockGroups: GeographicItem[] = [
    { id: 1, name: 'Grupo San Luis', count: 25, percentage: 50, parentName: 'Distrito Sucre' },
    { id: 2, name: 'Grupo La Salle', count: 15, percentage: 30, parentName: 'Distrito Chacao' },
    { id: 3, name: 'Grupo San Sebastian', count: 5, percentage: 10, parentName: 'Distrito Maracaibo' },
    { id: 4, name: 'Grupo Chiquinquira', count: 3, percentage: 6, parentName: 'Distrito Maracaibo' },
    { id: 5, name: 'Grupo Cabriales', count: 2, percentage: 4, parentName: 'Distrito Valencia' },
    { id: 6, name: 'Grupo Paramacay', count: 1, percentage: 2, parentName: 'Distrito Valencia' }
  ];

  it('renders header and total count of groups without top-right badge', () => {
    render(<GroupSummaryTable groups={mockGroups} />);

    expect(screen.getByText('Reconocimientos entregados por Grupo Scout')).toBeInTheDocument();
    expect(screen.queryByText('6 grupos')).not.toBeInTheDocument();
    // Bottom-right count of all 6 groups stays visible even when collapsed to Top 5
    expect(screen.getByText('Total de grupos')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();

    // By default, displays first 5 items
    expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
    expect(screen.getByText('Grupo La Salle')).toBeInTheDocument();
    expect(screen.queryByText('Grupo Paramacay')).not.toBeInTheDocument();
  });

  it('toggles expansion when clicking "Ver todos" and "Mostrar menos"', () => {
    render(<GroupSummaryTable groups={mockGroups} />);

    const toggleButton = screen.getByRole('button', { name: /ver todos/i });
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);

    // Now 6th item is visible
    expect(screen.getByText('Grupo Paramacay')).toBeInTheDocument();
    expect(screen.getByText(/mostrar menos/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mostrar menos/i }));
    expect(screen.queryByText('Grupo Paramacay')).not.toBeInTheDocument();
  });

  it('renders empty state message when groups list is empty', () => {
    render(<GroupSummaryTable groups={[]} />);

    expect(screen.queryByText('0 grupos')).not.toBeInTheDocument();
    expect(screen.getByText('Total de grupos')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(
      screen.getByText('No hay registros disponibles por grupo scout para los filtros seleccionados.')
    ).toBeInTheDocument();
  });

  it('renders YoY comparative columns and splits Total de grupos by current and previous year', () => {
    const yoy: YoYComparisonData = {
      hasPreviousYearData: true,
      currentYear: 2026,
      previousYear: 2025,
      totalDiplomas: { current: 10, previous: 5, diff: 5, percentChange: 100 },
      totalBatches: { current: 2, previous: 1, diff: 1, percentChange: 100 },
      totalMembers: { current: 10, previous: 5, diff: 5, percentChange: 100 },
      regions: [],
      districts: [],
      groups: [
        {
          id: 1,
          name: 'Grupo San Luis',
          parentName: 'Distrito Sucre',
          currentCount: 7,
          previousCount: 5,
          diff: 2,
          percentChange: 40,
          currentPercentage: 70,
          previousPercentage: 100
        },
        {
          id: 2,
          name: 'Grupo La Salle',
          parentName: 'Distrito Chacao',
          currentCount: 3,
          previousCount: 0,
          diff: 3,
          percentChange: null,
          currentPercentage: 30,
          previousPercentage: 0
        }
      ],
      units: [],
      demographics: {
        young: { current: 6, previous: 3, diff: 3, percentChange: 100, currentPercentage: 60, previousPercentage: 60 },
        adult: { current: 4, previous: 2, diff: 2, percentChange: 100, currentPercentage: 40, previousPercentage: 40 },
        total: { current: 10, previous: 5, diff: 5, percentChange: 100 }
      },
      monthly: []
    };

    render(<GroupSummaryTable groups={mockGroups} yoy={yoy} />);

    expect(screen.getByText('Total (2026)')).toBeInTheDocument();
    expect(screen.getByText('Año Anterior (2025)')).toBeInTheDocument();
    expect(screen.getByText('Variación')).toBeInTheDocument();
    expect(screen.getByText('Total de grupos')).toBeInTheDocument();
    expect(screen.getByText('Año 2026')).toBeInTheDocument();
    expect(screen.getByText('Año 2025')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
