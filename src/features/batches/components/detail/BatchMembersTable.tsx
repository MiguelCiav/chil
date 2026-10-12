import React from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { flexRender, Table } from '@tanstack/react-table';
import { ScoutMember } from '../../types';

export interface BatchMembersTableProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  table: Table<ScoutMember>;
  columnsCount: number;
  totalMembersCount: number;
}

export const BatchMembersTable: React.FC<BatchMembersTableProps> = ({
  searchQuery,
  onSearchChange,
  table,
  columnsCount,
  totalMembersCount
}) => {
  const currentPageRows = table.getRowModel().rows;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  return (
    <div
      data-walkthrough="batch-detail-members-table"
      className="w-full border border-primary/20 rounded-2xl overflow-hidden bg-white"
    >
      {/* Table Header with Search Input */}
      <div className="p-4 sm:p-5 border-b border-primary/20 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-base sm:text-lg font-bold text-neutral">Miembros del Lote</h2>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral/40 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar miembro..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-[#faf8f5] text-neutral text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-neutral/40"
          />
        </div>
      </div>

      {/* TanStack Table */}
      <div className="overflow-x-auto min-h-[260px] pb-12">
        <table className="w-full text-left border-collapse font-sans">
          <thead>
            <tr className="bg-primary/10 border-b border-primary/20">
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {currentPageRows.length > 0 ? (
              currentPageRows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-primary/5 transition-colors bg-white"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 text-sm whitespace-nowrap text-neutral"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnsCount} className="px-6 py-12 text-center text-neutral/50">
                  No se encontraron miembros para el criterio de búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with Numbered Pagination Controls */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-neutral/60">
        <div>
          Mostrando{' '}
          {currentPageRows.length > 0
            ? `${pageIndex * 10 + 1}-${Math.min(
                (pageIndex + 1) * 10,
                totalMembersCount
              )}`
            : 0}{' '}
          de {totalMembersCount} miembros
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: pageCount }, (_, i) => i)
            .slice(0, 5)
            .map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => table.setPageIndex(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                  pageIndex === idx
                    ? 'bg-[#743e1d] text-white'
                    : 'text-neutral/70 hover:bg-gray-100'
                }`}
              >
                {idx + 1}
              </button>
            ))}

          {pageCount > 5 && <span className="px-1 text-neutral/40">...</span>}

          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
