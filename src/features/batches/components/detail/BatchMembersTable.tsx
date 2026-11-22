import React from 'react';
import { Table } from '@tanstack/react-table';
import { Card } from '../../../../components/Card';
import { DataTable } from '../../../../components/DataTable';
import { Pagination } from '../../../../components/Pagination';
import { SearchInput } from '../../../../components/SearchInput';
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
  return (
    <Card data-walkthrough="batch-detail-members-table">
      {/* Table Header with Search Input */}
      <div className="p-4 sm:p-5 border-b border-primary/20 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-base sm:text-lg font-bold text-neutral">Miembros del Lote</h2>

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
