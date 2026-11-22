import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ColumnDef,
  Row,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable
} from '@tanstack/react-table';
import {
  Award,
  Plus,
  Pencil,
  Trash2,
  Palette
} from 'lucide-react';

import {
  Card,
  CardBody,
  Button,
  Toast,
  SearchInput,
  ErrorAlert,
  DataTable,
  Pagination
} from '../../../components';
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
        <Award className="w-4 h-4" aria-hidden="true" />
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-neutral text-sm">{item.name}</span>
        <span className="text-xs text-neutral/75 font-mono">{item.id}</span>
      </div>
    </div>
  );
}

function renderRecognitionDateCell(dateStr?: string) {
  return <span className="text-xs text-neutral/75">{formatCreationDate(dateStr)}</span>;
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
        className="p-1.5 text-neutral/75 hover:text-primary hover:bg-primary/5 rounded-lg border border-primary/20 transition-colors"
        title="Editar Reconocimiento"
        aria-label={`Editar ${item.name}`}
      >
        <Pencil className="w-4 h-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => onDelete(item)}
        className="p-1.5 text-neutral/75 hover:text-red-700 hover:bg-red-50 rounded-lg border border-primary/20 hover:border-red-200 transition-colors"
        title="Eliminar Reconocimiento"
        aria-label={`Eliminar ${item.name}`}
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function renderRecognitionActionsHeader() {
  return <div className="text-right">Acciones</div>;
}

interface RecognitionEmptyStateProps {
  totalCount: number;
  globalFilter: string;
  onClearFilter: () => void;
  onOpenCreate: () => void;
}

function renderRecognitionEmptyState({
  totalCount,
  globalFilter,
  onClearFilter,
  onOpenCreate
}: RecognitionEmptyStateProps) {
  if (totalCount === 0) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Award className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-neutral">
            No hay tipos de reconocimiento registrados
          </h3>
          <p className="text-sm text-neutral/75">
            No hay tipos de reconocimiento registrados. Haga clic en &apos;Nuevo Reconocimiento&apos; para comenzar.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onOpenCreate}
          icon={<Plus size={16} />}
          className="mt-2"
        >
          Nuevo Reconocimiento
        </Button>
      </div>
    );
  }

  return (
    <div className="py-4 flex flex-col items-center justify-center gap-2 text-neutral/75">
      <Award className="w-8 h-8 text-neutral/75" aria-hidden="true" />
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
  );
}

export const RecognitionCatalog: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recognitions, setRecognitions] = useState<RecognitionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecognition, setEditingRecognition] = useState<RecognitionType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRecognition, setDeletingRecognition] = useState<RecognitionType | null>(null);

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const triggerToast = (msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    setShowToast(true);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const fetchRecognitions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAllRecognitionTypes(user?.uid);
      setRecognitions(data);
    } catch (err) {
      console.error('Error fetching recognitions:', err);
      setLoadError('No se pudo cargar el catálogo de reconocimientos.');
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

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
  };

  const handleOpenEditModal = (recognition: RecognitionType) => {
    setEditingRecognition(recognition);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteModal = (recognition: RecognitionType) => {
    setDeletingRecognition(recognition);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
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
    if (deleted) {
      triggerToast(`Reconocimiento "${deleted.name}" eliminado exitosamente.`);
    } else {
      triggerToast('Reconocimiento eliminado exitosamente.');
    }
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

  const totalCount = recognitions.length;
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans py-2">
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          variant="success"
          onDismiss={() => setShowToast(false)}
        />
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight">
            Tipos de Reconocimiento
          </h1>
          <p className="text-xs sm:text-sm text-neutral/75 mt-1">
            Administre las condecoraciones, insignias y certificaciones scouts disponibles en el sistema.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenCreateModal}
          icon={<Plus size={18} />}
          className="flex-shrink-0"
        >
          Nuevo Reconocimiento
        </Button>
      </div>

      {loadError && (
        <ErrorAlert variant="inline" message={loadError} onRetry={fetchRecognitions} />
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardBody padding="sm">
          <div className="w-full md:w-80">
            <SearchInput
              size="sm"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              onClear={() => setGlobalFilter('')}
              placeholder="Buscar reconocimiento..."
            />
          </div>
        </CardBody>
      </Card>

      {/* Main Table */}
      <Card>
        <DataTable
          table={table}
          columnCount={columns.length}
          bordered={false}
          loading={loading}
          loadingMessage="Cargando tipos de reconocimiento..."
          scrollContainerClassName="min-h-[260px] pb-6"
          emptyState={renderRecognitionEmptyState({
            totalCount,
            globalFilter,
            onClearFilter: () => setGlobalFilter(''),
            onOpenCreate: handleOpenCreateModal
          })}
        />

        {!loading && (
          <Pagination
            table={table}
            totalCount={totalCount}
            filteredCount={filteredCount}
            itemLabel="reconocimientos"
            mode="summary"
            counterFormat="count"
            hideWhenEmpty
          />
        )}
      </Card>

      {/* Modals */}
      <RecognitionFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        recognition={editingRecognition}
        onCreateSuccess={handleCreateSuccess}
        onEditSuccess={handleEditSuccess}
      />

      <RecognitionDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        recognition={deletingRecognition}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};

export default RecognitionCatalog;
