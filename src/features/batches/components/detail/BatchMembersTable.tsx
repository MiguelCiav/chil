import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Table } from '@tanstack/react-table';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { DataTable } from '../../../../components/DataTable';
import { Pagination } from '../../../../components/Pagination';
import { SearchInput } from '../../../../components/SearchInput';
import { ScoutMember } from '../../types';
import type { VerificationProgress } from '../../utils/scraperVerificationPool';

export interface BatchMembersTableProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  table: Table<ScoutMember>;
  columnsCount: number;
  totalMembersCount: number;
  reverifiableCount?: number;
  isReverifying?: boolean;
  reverifyProgress?: VerificationProgress | null;
  onReverifyAll?: () => void;
}

export const BatchMembersTable: React.FC<BatchMembersTableProps> = ({
  searchQuery,
  onSearchChange,
  table,
  columnsCount,
  totalMembersCount,
  reverifiableCount = 0,
  isReverifying = false,
  reverifyProgress = null,
  onReverifyAll
}) => {
  return (
    <Card data-walkthrough="batch-detail-members-table">
      {/* Table Header with Re-verify Action and Search Input */}
      <div className="p-4 sm:p-5 border-b border-primary/20 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-base sm:text-lg font-bold text-neutral">Miembros del Lote</h2>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {reverifiableCount > 0 && onReverifyAll && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReverifyAll}
              disabled={isReverifying}
              icon={<RefreshCw size={14} className={isReverifying ? 'animate-spin' : ''} />}
            >
              {isReverifying && reverifyProgress
                ? `Verificando ${reverifyProgress.current} de ${reverifyProgress.total}...`
                : `Re-verificar (${reverifiableCount})`}
            </Button>
          )}

          <div className="w-full sm:w-72">
            <SearchInput
              size="sm"
              placeholder="Buscar miembro..."
              aria-label="Buscar miembro"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onClear={() => onSearchChange('')}
            />
          </div>
        </div>
      </div>

      {/* TanStack Table */}
      <DataTable
        table={table}
        columnCount={columnsCount}
        bordered={false}
        scrollContainerClassName="min-h-[260px] pb-12"
        emptyState="No se encontraron miembros para el criterio de búsqueda."
      />

      {/* Footer with Numbered Pagination Controls */}
      <Pagination
        table={table}
        totalCount={totalMembersCount}
        filteredCount={totalMembersCount}
        itemLabel="miembros"
        mode="numbered"
        counterFormat="range"
      />
    </Card>
  );
};
