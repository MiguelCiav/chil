import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ColumnDef,
  Row,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  flexRender
} from '@tanstack/react-table';
import {
  Award,
  Plus,
  Search,
  Pencil,
  Trash2,
  Palette,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X
} from 'lucide-react';

import { Card, CardBody } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { RecognitionType } from '../types';
import { getAllRecognitionTypes } from '../api';
import { RecognitionFormModal } from './RecognitionFormModal';
import { RecognitionDeleteModal } from './RecognitionDeleteModal';
import { useAuth } from '../../auth';

function formatCreationDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function renderRecognitionNameCell(item: RecognitionType) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <Award className="w-4 h-4" />
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-neutral text-sm">{item.name}</span>
        <span className="text-xs text-neutral/40 font-mono">{item.id}</span>
      </div>
    </div>
  );
}

function renderRecognitionDateCell(dateStr?: string) {
  return <span className="text-xs text-neutral/60">{formatCreationDate(dateStr)}</span>;
}

function renderRecognitionNameCellDef({ row }: { row: Row<RecognitionType> }) {
  return renderRecognitionNameCell(row.original);
}

function renderRecognitionDateCellDef({ getValue }: { getValue: () => unknown }) {
  return renderRecognitionDateCell(getValue() as string);
}

interface RecognitionActionsCellProps {
  item: RecognitionType;
  onNavigateTemplate: (id: string) => void;
  onEdit: (item: RecognitionType) => void;
  onDelete: (item: RecognitionType) => void;
}

function renderRecognitionActionsCell({
  item,
  onNavigateTemplate,
  onEdit,
  onDelete
}: RecognitionActionsCellProps) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => {
          onNavigateTemplate(item.id);
        }}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors"
        title="Diseñar Plantilla de Certificado"
        aria-label={`Diseñar plantilla para ${item.name}`}
      >
        <Palette className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Plantilla</span>
      </button>

      <button
        type="button"
        onClick={() => onEdit(item)}
        className="p-1.5 text-neutral/60 hover:text-primary hover:bg-primary/5 rounded-lg border border-gray-200 hover:border-primary/20 transition-colors"
        title="Editar Reconocimiento"
        aria-label={`Editar ${item.name}`}
      >
        <Pencil className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => onDelete(item)}
        className="p-1.5 text-neutral/60 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 hover:border-red-200 transition-colors"
        title="Eliminar Reconocimiento"
        aria-label={`Eliminar ${item.name}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function renderRecognitionActionsHeader() {
  return <div className="text-right">Acciones</div>;
}

interface TableBodyContentProps {
  loading: boolean;
  rows: Row<RecognitionType>[];
  totalCount: number;
  columnsLength: number;
  globalFilter: string;
  onClearFilter: () => void;
  onOpenCreate: () => void;
}

function renderTableBodyContent({
  loading,
  rows,
  totalCount,
  columnsLength,
  globalFilter,
  onClearFilter,
  onOpenCreate
}: TableBodyContentProps) {
  if (loading) {
    return (
      <tr>
        <td colSpan={columnsLength} className="px-6 py-12 text-center text-neutral/60">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Cargando tipos de reconocimiento...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (rows.length > 0) {
    return rows.map((row) => (
      <tr key={row.id} className="hover:bg-primary/5 transition-colors bg-white">
        {row.getVisibleCells().map((cell) => (
          <td key={cell.id} className="px-6 py-4 text-sm text-neutral whitespace-nowrap">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    ));
  }

  if (totalCount === 0) {
    return (
      <tr>
        <td colSpan={columnsLength} className="px-6 py-16 text-center text-neutral/60">
          <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral">
                No hay tipos de reconocimiento registrados
              </h3>
              <p className="text-sm text-neutral/60">
                No hay tipos de reconocimiento registrados. Haga clic en &apos;Nuevo Reconocimiento&apos; para comenzar.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onOpenCreate}
              icon={<Plus size={16} />}
              className="mt-2 shadow-sm"
            >
              Nuevo Reconocimiento
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={columnsLength} className="px-6 py-12 text-center text-neutral/60">
        <div className="flex flex-col items-center justify-center gap-2">
          <Award className="w-8 h-8 text-neutral/30" />
          <p className="text-sm font-medium">No se encontraron reconocimientos.</p>
          {globalFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Limpiar filtros de búsqueda
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export const RecognitionCatalog: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recognitions, setRecognitions] = useState<RecognitionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecognition, setEditingRecognition] = useState<RecognitionType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRecognition, setDeletingRecognition] = useState<RecognitionType | null>(null);

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const fetchRecognitions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllRecognitionTypes(user?.uid);
      setRecognitions(data);
    } catch (err) {
      console.error('Error fetching recognitions:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchRecognitions();
  }, [fetchRecognitions]);

  const handleOpenCreateModal = () => {
    setEditingRecognition(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (recognition: RecognitionType) => {
    setEditingRecognition(recognition);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteModal = (recognition: RecognitionType) => {
    setDeletingRecognition(recognition);
    setIsDeleteModalOpen(true);
  };

  const handleCreateSuccess = (saved: RecognitionType) => {
    setRecognitions(prev => [saved, ...prev.filter(r => r.id !== saved.id)]);
    triggerToast(`Reconocimiento "${saved.name}" creado exitosamente.`);
  };

  const handleEditSuccess = (saved: RecognitionType) => {
    setRecognitions(prev => prev.map(r => (r.id === saved.id ? saved : r)));
    triggerToast(`Reconocimiento "${saved.name}" actualizado exitosamente.`);
  };

  const handleDeleteSuccess = (deletedId: string) => {
    const deleted = recognitions.find(r => r.id === deletedId);
    setRecognitions(prev => prev.filter(r => r.id !== deletedId));
    triggerToast(
      deleted
        ? `Reconocimiento "${deleted.name}" eliminado exitosamente.`
        : 'Reconocimiento eliminado exitosamente.'
    );
  };

  const columns = useMemo<ColumnDef<RecognitionType>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nombre',
        cell: renderRecognitionNameCellDef
      },
      {
        accessorKey: 'created_at',
        header: 'Fecha de Creación',
        cell: renderRecognitionDateCellDef
      },
      {
        id: 'actions',
        header: renderRecognitionActionsHeader,
        cell: ({ row }) =>
          renderRecognitionActionsCell({
            item: row.original,
            onNavigateTemplate: (id) => navigate(`/reconocimientos/${id}/plantilla`),
            onEdit: handleOpenEditModal,
            onDelete: handleOpenDeleteModal
          })
      }
    ],
    [navigate]
  );

  const table = useReactTable({
    data: recognitions,
    columns,
    state: {
      globalFilter
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  const currentPageRows = table.getRowModel().rows;
  const totalCount = recognitions.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans py-2">
      {/* Toast Notification */}
      {showToast && (
        <div
          role="alert"
          className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-neutral text-white px-5 py-3 rounded-2xl shadow-xl border border-primary/20 animate-fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight">
            Tipos de Reconocimiento
          </h1>
          <p className="text-xs sm:text-sm text-neutral/70 mt-1">
            Administre las condecoraciones, insignias y certificaciones scouts disponibles en el sistema.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenCreateModal}
          icon={<Plus size={18} />}
          className="shadow-sm flex-shrink-0"
        >
          Nuevo Reconocimiento
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm border-gray-200">
        <CardBody className="p-4">
          {/* Search input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral/40" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Buscar reconocimiento..."
              className="w-full pl-9 pr-8 py-2 bg-primary/5 border border-primary/20 rounded-xl text-sm text-neutral placeholder-neutral/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => setGlobalFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral/40 hover:text-neutral"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Main Table */}
      <div className="w-full border border-primary/20 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto min-h-[260px] pb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-primary/10 border-b border-primary/20">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
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
            <tbody className="divide-y divide-gray-100">
              {renderTableBodyContent({
                loading,
                rows: currentPageRows,
                totalCount,
                columnsLength: columns.length,
                globalFilter,
                onClearFilter: () => setGlobalFilter(''),
                onOpenCreate: handleOpenCreateModal
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        {!loading && totalCount > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between text-xs font-semibold text-neutral/60">
            <div>
              Mostrando {currentPageRows.length} de {totalCount} reconocimientos
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
        )}
      </div>

      {/* Modals */}
      <RecognitionFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        recognition={editingRecognition}
        onCreateSuccess={handleCreateSuccess}
        onEditSuccess={handleEditSuccess}
      />

      <RecognitionDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        recognition={deletingRecognition}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};

export default RecognitionCatalog;
