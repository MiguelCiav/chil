import React from 'react';
import { flexRender, Table as TanStackTable } from '@tanstack/react-table';

export interface DataTableProps<TData> {
  readonly table: TanStackTable<TData>;
  readonly columnCount: number;
  readonly bordered?: boolean;
  readonly loading?: boolean;
  readonly loadingMessage?: string;
  readonly emptyState?: React.ReactNode;
  readonly scrollContainerClassName?: string;
  readonly className?: string;
}

/**
 * Inverted stateless TanStack table renderer accepting a parent-managed `table` instance.
 */
export function DataTable<TData>({
  table,
  columnCount,
  bordered = true,
  loading = false,
  loadingMessage = 'Cargando...',
  emptyState,
  scrollContainerClassName = '',
  className = ''
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;

  const wrapperClasses = bordered
    ? `w-full border border-primary/20 rounded-2xl overflow-hidden bg-white ${className}`
    : `w-full ${className}`;

  let bodyContent: React.ReactNode;
  if (loading) {
    bodyContent = (
      <tr>
        <td colSpan={columnCount} className="px-6 py-10 text-center text-sm text-neutral/75">
          <output aria-busy="true" className="inline-flex items-center gap-2">
            <div
              className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>{loadingMessage}</span>
          </output>
        </td>
      </tr>
    );
  } else if (rows.length === 0) {
    bodyContent = (
      <tr>
        <td colSpan={columnCount} className="px-6 py-8 text-center text-sm text-neutral/75">
          {emptyState ?? 'No hay datos disponibles.'}
        </td>
      </tr>
    );
  } else {
    bodyContent = rows.map(row => (
      <tr key={row.id} className="hover:bg-primary/5 transition-colors bg-white">
        {row.getVisibleCells().map(cell => (
          <td key={cell.id} className="px-6 py-4 text-sm text-neutral whitespace-nowrap">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <div className={wrapperClasses}>
      <div className={`overflow-x-auto ${scrollContainerClassName}`}>
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-primary/10 border-b border-primary/20">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan > 1 ? header.colSpan : undefined}
                    className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {bodyContent}
          </tbody>
        </table>
      </div>
    </div>
  );
}
