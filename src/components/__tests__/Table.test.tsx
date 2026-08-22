import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Table } from '../Table';
import { ColumnDef } from '@tanstack/react-table';

interface SampleItem {
  id: number;
  name: string;
  role: string;
}

describe('Table component', () => {
  const columns: ColumnDef<SampleItem>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: info => info.getValue()
    },
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: info => info.getValue()
    },
    {
      accessorKey: 'role',
      header: 'Rol',
      cell: info => info.getValue()
    }
  ];

  it('renders table headers and data rows correctly', () => {
    const data: SampleItem[] = [
      { id: 1, name: 'Alice', role: 'Scout' },
      { id: 2, name: 'Bob', role: 'Leader' }
    ];

    render(<Table columns={columns} data={data} className="my-table" />);

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Rol')).toBeInTheDocument();

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Scout')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Leader')).toBeInTheDocument();
  });

  it('renders empty data message when data array is empty', () => {
    render(<Table columns={columns} data={[]} />);

    expect(screen.getByText('No hay datos disponibles.')).toBeInTheDocument();
  });
});
