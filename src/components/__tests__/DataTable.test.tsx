import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  ColumnDef
} from '@tanstack/react-table';
import { DataTable } from '../DataTable';
import { Pagination, PaginationMode, PaginationCounterFormat } from '../Pagination';

interface RowItem {
  id: number;
  name: string;
}

const COLUMNS: ColumnDef<RowItem>[] = [
  { accessorKey: 'id', header: 'ID', cell: info => info.getValue() },
  { accessorKey: 'name', header: 'Nombre', cell: info => info.getValue() }
];

interface HarnessProps {
  data: RowItem[];
  loading?: boolean;
  bordered?: boolean;
  emptyState?: React.ReactNode;
  mode?: PaginationMode;
  counterFormat?: PaginationCounterFormat;
  pageSizeOptions?: number[];
  hideWhenEmpty?: boolean;
  initialPageSize?: number;
}

const TableHarness: React.FC<HarnessProps> = ({
  data,
  loading = false,
  bordered = true,
  emptyState,
  mode = 'summary',
  counterFormat = 'count',
  pageSizeOptions,
  hideWhenEmpty = false,
  initialPageSize = 5
}) => {
  const table = useReactTable({
    data,
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: initialPageSize } }
  });

  return (
    <div>
      <DataTable
        table={table}
        columnCount={COLUMNS.length}
        bordered={bordered}
        loading={loading}
        emptyState={emptyState}
      />
      <Pagination
        table={table}
        totalCount={data.length}
        itemLabel="registros"
        mode={mode}
        counterFormat={counterFormat}
        pageSizeOptions={pageSizeOptions}
        hideWhenEmpty={hideWhenEmpty}
      />
    </div>
  );
};

describe('DataTable & Pagination components', () => {
  it('renders rows, bordered={false} mode, and loading precedence over emptyState', () => {
    const { container, rerender } = render(
      <TableHarness
        data={[{ id: 1, name: 'Ana' }]}
        bordered={false}
      />
    );

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(container.querySelector('.rounded-2xl')).toBeNull();

    rerender(
      <TableHarness
        data={[]}
        loading={true}
        emptyState="Sin resultados"
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Cargando...');
    expect(screen.queryByText('Sin resultados')).not.toBeInTheDocument();

    rerender(<TableHarness data={[]} />);
    expect(screen.getByText('No hay datos disponibles.')).toBeInTheDocument();
  });

  it('supports summary-total counter, pageSize selector, and totalCount === 0 pagination', () => {
    const items = Array.from({ length: 12 }, (_, idx) => ({ id: idx + 1, name: `Item ${idx + 1}` }));
    const { rerender } = render(
      <TableHarness
        data={items}
        mode="summary"
        counterFormat="summary-total"
        pageSizeOptions={[5, 10]}
        initialPageSize={5}
      />
    );

    expect(screen.getByText('Mostrando 12 de 12 registros totales')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Selector de filas por página'), { target: { value: '10' } });
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();

    rerender(
      <TableHarness
        data={[]}
        mode="summary"
        counterFormat="summary-total"
      />
    );
    expect(screen.getByText('Página 0 de 0')).toBeInTheDocument();

    rerender(<TableHarness data={[]} hideWhenEmpty={true} />);
    expect(screen.queryByLabelText('Página anterior')).not.toBeInTheDocument();
  });

  it('supports numbered mode capped to 5 buttons with ellipsis and range counter', () => {
    const items = Array.from({ length: 14 }, (_, idx) => ({ id: idx + 1, name: `Item ${idx + 1}` }));
    render(
      <TableHarness
        data={items}
        mode="numbered"
        counterFormat="range"
        initialPageSize={2}
      />
    );

    expect(screen.getByText('Mostrando 1-2 de 14 registros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '6' })).not.toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Página siguiente'));
    expect(screen.getByText('Mostrando 3-4 de 14 registros')).toBeInTheDocument();
  });
});
