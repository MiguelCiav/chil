import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GroupSummaryTable } from '../GroupSummaryTable';
import { GeographicItem } from '../../../types';

describe('GroupSummaryTable Component', () => {
  const mockGroups: GeographicItem[] = [
    { id: 1, name: 'Grupo San Luis', count: 25, percentage: 50, parentName: 'Distrito Sucre' },
    { id: 2, name: 'Grupo La Salle', count: 15, percentage: 30, parentName: 'Distrito Chacao' },
    { id: 3, name: 'Grupo San Sebastian', count: 5, percentage: 10, parentName: 'Distrito Maracaibo' },
    { id: 4, name: 'Grupo Chiquinquira', count: 3, percentage: 6, parentName: 'Distrito Maracaibo' },
    { id: 5, name: 'Grupo Cabriales', count: 2, percentage: 4, parentName: 'Distrito Valencia' },
    { id: 6, name: 'Grupo Paramacay', count: 1, percentage: 2, parentName: 'Distrito Valencia' }
  ];

  it('renders header, badge, and groups list', () => {
    render(<GroupSummaryTable groups={mockGroups} />);

    expect(screen.getByText('Reconocimientos entregados por Grupo Scout')).toBeInTheDocument();
    expect(screen.getByText('6 grupos')).toBeInTheDocument();

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

    expect(screen.getByText('0 grupos')).toBeInTheDocument();
    expect(
      screen.getByText('No hay registros disponibles por grupo scout para los filtros seleccionados.')
    ).toBeInTheDocument();
  });
});
