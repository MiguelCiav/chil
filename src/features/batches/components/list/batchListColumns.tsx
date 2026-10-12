import { ColumnDef, flexRender, Row } from '@tanstack/react-table';
import {
  FileText,
  Download,
  Trash2,
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import { getRecognitionBadgeStyle } from '../../api';
import {
  BatchRowData,
  BatchActionsCellProps,
  BatchListColumnsParams
} from './types';

export function renderBatchDateCell(info: { getValue: () => unknown }) {
  return <span className="font-medium text-neutral">{info.getValue() as string}</span>;
}

export function renderBatchRegionCell(info: { getValue: () => unknown }) {
  return <span className="font-normal text-neutral/80">{info.getValue() as string}</span>;
}

export function renderBatchDistrictCell(info: { getValue: () => unknown }) {
  return <span className="font-normal text-neutral/80">{info.getValue() as string}</span>;
}

export function renderBatchGroupCell(info: { getValue: () => unknown }) {
  return <span className="font-semibold text-neutral">{info.getValue() as string}</span>;
}

export function renderBatchRecognitionCell(info: { getValue: () => unknown }) {
  const name = info.getValue() as string;
  const style = getRecognitionBadgeStyle(name);
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${style.pillClass}`}>
      {name}
    </span>
  );
}

export function renderBatchMembersCell(info: { getValue: () => unknown }) {
  return (
    <span className="font-medium text-neutral">{info.getValue() as number} Miembros</span>
  );
}

export function renderBatchActionsCell(props: BatchActionsCellProps) {
  const {
    row,
    table,
    openActionMenuId,
    setOpenActionMenuId,
    navigate,
    handleDownloadPDF,
    handleDeleteClick,
    downloadingId
  } = props;
  const rowData = row.original;
  const isMenuOpen = openActionMenuId === rowData.id;
  const totalRows = table.getRowModel().rows.length;
  const isNearBottom = (row.index >= totalRows - 2 && totalRows > 1) || (totalRows <= 3 && row.index > 0);
  const dropdownPosition = isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1';

  return (
    <div className="relative inline-block font-sans">
      <button
        type="button"
        onClick={() => setOpenActionMenuId(isMenuOpen ? null : rowData.id)}
        className="p-1.5 text-neutral/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus:outline-none"
        aria-label={`Acciones del lote ${rowData.id}`}
        title="Acciones"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isMenuOpen && (
        <div className={`absolute right-0 ${dropdownPosition} w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 font-sans`}>
          <button
            type="button"
            onClick={() => {
              setOpenActionMenuId(null);
              navigate(`/lotes/${rowData.id}`);
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5 text-primary" />
            Ver detalle
          </button>
          <button
            type="button"
            onClick={() => {
              setOpenActionMenuId(null);
              handleDownloadPDF(rowData.id);
            }}
            disabled={downloadingId === rowData.id}
            className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            {downloadingId === rowData.id ? 'Descargando...' : 'Descargar reconocimientos (ZIP)'}
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            type="button"
            onClick={() => handleDeleteClick(rowData)}
            className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            Eliminar lote
          </button>
        </div>
      )}
    </div>
  );
}

export function renderBatchTableRows(
  loading: boolean,
  rows: Row<BatchRowData>[],
  columnsCount: number
) {
  if (loading) {
    return (
      <tr>
        <td colSpan={columnsCount} className="px-6 py-12 text-center text-neutral/50 font-medium">
          Cargando listado de lotes...
        </td>
      </tr>
    );
  }
  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={columnsCount} className="px-6 py-12 text-center text-neutral/60">
          <div className="space-y-2">
            <AlertCircle className="w-8 h-8 text-neutral/30 mx-auto" />
            <p className="font-semibold text-neutral">No se encontraron lotes registrados.</p>
            <p className="text-xs text-neutral/50">Cree un nuevo lote o modifique los filtros activos.</p>
          </div>
        </td>
      </tr>
    );
  }
  return rows.map(row => {
    return (
      <tr
        key={row.id}
        className="hover:bg-primary/5 transition-colors bg-white"
      >
        {row.getVisibleCells().map(cell => (
          <td key={cell.id} className="px-6 py-4 text-sm whitespace-nowrap text-neutral">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    );
  });
}

export function createBatchListColumns(params: BatchListColumnsParams): ColumnDef<BatchRowData>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Seleccionar todos los lotes"
          checked={table.getIsAllPageRowsSelected()}
          ref={input => {
            if (input) {
              input.indeterminate = table.getIsSomePageRowsSelected();
            }
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label={`Seleccionar lote ${row.original.id}`}
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
        />
      )
    },
    {
      accessorKey: 'formattedDate',
      header: 'FECHA DE EMISIÓN',
      cell: renderBatchDateCell
    },
    {
      accessorKey: 'regionName',
      header: 'REGIÓN',
      cell: renderBatchRegionCell
    },
    {
      accessorKey: 'districtName',
      header: 'DISTRITO',
      cell: renderBatchDistrictCell
    },
    {
      accessorKey: 'groupName',
      header: 'GRUPO',
      cell: renderBatchGroupCell
    },
    {
      accessorKey: 'recognitionName',
      header: 'RECONOCIMIENTO',
      cell: renderBatchRecognitionCell
    },
    {
      accessorKey: 'memberCount',
      header: 'CANTIDAD',
      cell: renderBatchMembersCell
    },
    {
      id: 'actions',
      header: 'ACCIONES',
      cell: ({ row, table }) =>
        renderBatchActionsCell({
          row,
          table,
          ...params
        })
    }
  ];
}
