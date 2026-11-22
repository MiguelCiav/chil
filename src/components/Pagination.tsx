import { Table as TanStackTable } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Select';

export type PaginationMode = 'summary' | 'numbered';
export type PaginationCounterFormat = 'summary-total' | 'count' | 'range';

export interface PaginationProps<TData> {
  readonly table: TanStackTable<TData>;
  readonly totalCount: number;
  readonly filteredCount?: number;
  readonly itemLabel: string;
  readonly mode?: PaginationMode;
  readonly counterFormat?: PaginationCounterFormat;
  readonly pageSizeOptions?: readonly number[];
  readonly hideWhenEmpty?: boolean;
}

/**
 * Shared table pagination footer synced to a parent TanStack `table` instance.
 */
export function Pagination<TData>({
  table,
  totalCount,
  filteredCount,
  itemLabel,
  mode = 'summary',
  counterFormat = 'count',
  pageSizeOptions,
  hideWhenEmpty = false
}: PaginationProps<TData>) {
  if (hideWhenEmpty && totalCount === 0) {
    return null;
  }

  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const effectiveFiltered = filteredCount ?? totalCount;
  const currentRowCount = table.getRowModel().rows.length;

  let summaryText: string;
  if (counterFormat === 'summary-total') {
    summaryText = `Mostrando ${effectiveFiltered} de ${totalCount} ${itemLabel} totales`;
  } else if (counterFormat === 'range') {
    const start = effectiveFiltered === 0 ? 0 : pageIndex * pageSize + 1;
    const end = Math.min((pageIndex + 1) * pageSize, effectiveFiltered);
    summaryText = `Mostrando ${start}-${end} de ${effectiveFiltered} ${itemLabel}`;
  } else {
    summaryText = `Mostrando ${currentRowCount} de ${effectiveFiltered} ${itemLabel}`;
  }

  const visiblePages = Array.from({ length: pageCount }, (_, i) => i).slice(0, 5);

  return (
    <div className="px-6 py-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral/75">
      <div className="font-medium">{summaryText}</div>

      <div className="flex flex-wrap items-center gap-3">
        {pageSizeOptions && pageSizeOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Filas por página:</span>
            <div className="w-20">
              <Select
                size="sm"
                aria-label="Selector de filas por página"
                value={String(pageSize)}
                onChange={e => table.setPageSize(Number(e.target.value))}
              >
                {pageSizeOptions.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Página anterior"
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          {mode === 'numbered' ? (
            <div className="flex items-center gap-1">
              {visiblePages.map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => table.setPageIndex(page)}
                  aria-current={pageIndex === page ? 'page' : undefined}
                  className={`min-w-7 h-7 px-2 rounded-lg text-xs font-semibold transition-colors ${
                    pageIndex === page
                      ? 'bg-primary text-white'
                      : 'border border-gray-200 text-neutral hover:bg-gray-50'
                  }`}
                >
                  {page + 1}
                </button>
              ))}
              {pageCount > 5 && <span className="px-1 text-neutral/75">...</span>}
            </div>
          ) : (
            <span className="px-2 font-medium text-neutral">
              Página {pageCount === 0 ? 0 : pageIndex + 1} de {pageCount}
            </span>
          )}

          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Página siguiente"
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
