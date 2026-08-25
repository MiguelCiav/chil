import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
  Row
} from '@tanstack/react-table';
import {
  X,
  Plus,
  FileText,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Zap
} from 'lucide-react';

import { Button } from '../../../components/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/Modal';

import {
  getAllBatches,
  getBatchById,
  getAllMembers,
  getMembersByBatchId,
  getHierarchyData,
  deleteBatch,
  getRecognitionBadgeStyle,
  getRecognitionName,
  RECOGNITION_TYPES
} from '../api';
import {
  generateBatchCertificatesPdf,
  getRecognitionTypeById,
  getAllRecognitionTypes,
  RecognitionType
} from '../../recognitions';
import {
  Batch,
  ScoutMember,
  Region,
  District,
  ScoutGroup,
  ActiveFilterChip
} from '../types';
import { useAuth } from '../../auth';

interface BatchRowData {
  id: number;
  batch: Batch;
  created_at: string;
  formattedDate: string;
  regionName: string;
  districtName: string;
  groupName: string;
  recognitionName: string;
  recognitionType: string;
  memberCount: number;
}

function formatBatchDate(dateStr: string): string {
  const dateObj = new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) {
    return 'Fecha no disponible';
  }
  return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateToDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return isoDate;
}

function matchesDateFilter(createdAt: string, filterValue: string): boolean {
  const batchDate = new Date(createdAt);
  if (Number.isNaN(batchDate.getTime())) return false;

  const now = new Date();

  // Predefined periods
  if (filterValue === 'Este Año') {
    return batchDate.getFullYear() === now.getFullYear();
  }
  if (filterValue === 'Este Mes') {
    return (
      batchDate.getFullYear() === now.getFullYear() &&
      batchDate.getMonth() === now.getMonth()
    );
  }
  if (filterValue === 'Últimos 30 días') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    return batchDate >= thirtyDaysAgo && batchDate <= now;
  }
  if (filterValue === 'Últimos 90 días') {
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    ninetyDaysAgo.setHours(0, 0, 0, 0);
    return batchDate >= ninetyDaysAgo && batchDate <= now;
  }
  if (filterValue === 'Todo el histórico') {
    return true;
  }

  // Date range: "DD/MM/YYYY - DD/MM/YYYY"
  if (filterValue.includes(' - ')) {
    const [startStr, endStr] = filterValue.split(' - ');
    const [sDay, sMonth, sYear] = startStr.split('/').map(Number);
    const [eDay, eMonth, eYear] = endStr.split('/').map(Number);
    if (sDay && sMonth && sYear && eDay && eMonth && eYear) {
      const startDate = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
      const endDate = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
      return batchDate >= startDate && batchDate <= endDate;
    }
  }

  // Specific date: "DD/MM/YYYY"
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(filterValue)) {
    const [day, month, year] = filterValue.split('/').map(Number);
    if (day && month && year) {
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
      return batchDate >= startOfDay && batchDate <= endOfDay;
    }
  }

  return true;
}

function matchesActiveFilters(row: BatchRowData, activeFilters: ActiveFilterChip[]): boolean {
  for (const filter of activeFilters) {
    if (filter.type === 'date') {
      if (!matchesDateFilter(row.created_at, filter.value)) {
        return false;
      }
    } else if (filter.type === 'region') {
      if (row.regionName !== filter.value && filter.value !== '-') return false;
    } else if (filter.type === 'district') {
      if (row.districtName !== filter.value && filter.value !== '-') return false;
    } else if (filter.type === 'group') {
      if (!row.groupName.toLowerCase().includes(filter.value.toLowerCase())) return false;
    } else if (filter.type === 'recognition') {
      if (row.recognitionName !== filter.value && row.recognitionType !== filter.value) return false;
    }
  }
  return true;
}

function getFilterLabelAndValue(
  filterType: 'date' | 'region' | 'district' | 'group' | 'recognition',
  filterValue: string,
  hierarchy: { regions: Region[]; districts: District[]; groups: ScoutGroup[] },
  recognitionTypes: RecognitionType[]
): { label: string; displayValue: string } {
  switch (filterType) {
    case 'date':
      return { label: 'Fecha', displayValue: filterValue };
    case 'region':
      return {
        label: 'Región',
        displayValue: hierarchy.regions.find(r => String(r.id) === filterValue)?.name || filterValue
      };
    case 'district':
      return {
        label: 'Distrito',
        displayValue: hierarchy.districts.find(d => String(d.id) === filterValue)?.name || filterValue
      };
    case 'group':
      return {
        label: 'Grupo',
        displayValue: hierarchy.groups.find(g => String(g.id) === filterValue)?.name || filterValue
      };
    case 'recognition': {
      const rec = recognitionTypes.find(
        r => r.id === filterValue || r.name.toLowerCase() === filterValue.toLowerCase()
      );
      return {
        label: 'Reconocimiento',
        displayValue: rec ? rec.name : getRecognitionName(filterValue)
      };
    }
  }
}

function renderBatchTableRows(
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
  return rows.map((row, index) => {
    const isLast = index === rows.length - 1;
    return (
      <tr
        key={row.id}
        className={`hover:bg-[#faf8f5] transition-colors ${!isLast ? 'border-b border-gray-100' : ''}`}
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

export const BatchList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [recognitionTypes, setRecognitionTypes] = useState<RecognitionType[]>([]);
  const [loading, setLoading] = useState(true);

  // Deletion modal state
  const [batchToDelete, setBatchToDelete] = useState<BatchRowData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Toast notification
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Filter state
  const [activeFilters, setActiveFilters] = useState<ActiveFilterChip[]>([
    { id: 'date-this-year', type: 'date', label: 'Fecha', value: 'Este Año' }
  ]);
  const [isAddFilterModalOpen, setIsAddFilterModalOpen] = useState(false);
  const [newFilterType, setNewFilterType] = useState<'date' | 'region' | 'district' | 'group' | 'recognition'>('region');
  const [newFilterValue, setNewFilterValue] = useState<string>('');

  // Date filter mode & values for Add Filter modal
  const [dateFilterMode, setDateFilterMode] = useState<'predefined' | 'range' | 'specific'>('predefined');
  const [datePredefinedValue, setDatePredefinedValue] = useState<string>('Este Año');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [dateSpecificValue, setDateSpecificValue] = useState<string>('');

  // Dropdown action menu state per row
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      getAllBatches(user?.uid),
      getAllMembers(user?.uid),
      getHierarchyData(),
      getAllRecognitionTypes(user?.uid)
    ])
      .then(([bList, mList, hierarchy, recTypes]) => {
        setBatches(bList);
        setMembers(mList);
        setRegions(hierarchy.regions);
        setDistricts(hierarchy.districts);
        setGroups(hierarchy.groups);
        setRecognitionTypes(recTypes || []);
      })
      .catch(err => {
        console.error("Error loading batches list data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.uid]);

  const resolveRecognitionName = useCallback((recType?: string) => {
    if (!recType) return '-';
    const found = recognitionTypes.find(
      r => r.id === recType || r.name.toLowerCase() === recType.toLowerCase()
    );
    return found ? found.name : getRecognitionName(recType);
  }, [recognitionTypes]);

  const handleDownloadPDF = useCallback(async (batchId: number) => {
    setDownloadingId(batchId);
    try {
      const targetBatch = batches.find(b => b.id === batchId) || (await getBatchById(batchId));
      if (!targetBatch) throw new Error('Lote no encontrado');

      let batchMembers = members.filter(m => m.batch_id === batchId);
      if (batchMembers.length === 0) {
        batchMembers = await getMembersByBatchId(batchId);
      }

      let recType: RecognitionType | null = null;
      if (targetBatch.recognition_type) {
        recType = await getRecognitionTypeById(targetBatch.recognition_type);
      }

      const fileName = await generateBatchCertificatesPdf({
        batch: targetBatch,
        members: batchMembers,
        recognition: recType,
        hierarchy: { regions, districts, groups }
      });
      setToastMessage(`Reconocimientos descargados: ${fileName}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Error al generar los reconocimientos en PDF.");
    } finally {
      setDownloadingId(null);
    }
  }, [batches, members, regions, districts, groups]);

  const handleDeleteClick = useCallback((rowData: BatchRowData) => {
    setOpenActionMenuId(null);
    setBatchToDelete(rowData);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!batchToDelete) return;
    setDeleting(true);
    try {
      await deleteBatch(batchToDelete.id);
      setBatches(prev => prev.filter(b => b.id !== batchToDelete.id));
      setMembers(prev => prev.filter(m => m.batch_id !== batchToDelete.id));
      setIsDeleteModalOpen(false);
      setBatchToDelete(null);
      setToastMessage('Lote eliminado exitosamente');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Error deleting batch:", err);
      alert("Error al eliminar el lote.");
    } finally {
      setDeleting(false);
    }
  };

  const removeFilter = (filterId: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const handleAddFilter = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    let computedFilterValue = newFilterValue;
    if (newFilterType === 'date') {
      if (dateFilterMode === 'predefined') {
        computedFilterValue = datePredefinedValue;
      } else if (dateFilterMode === 'range') {
        if (!dateRangeStart || !dateRangeEnd) return;
        computedFilterValue = `${formatDateToDisplay(dateRangeStart)} - ${formatDateToDisplay(dateRangeEnd)}`;
      } else if (dateFilterMode === 'specific') {
        if (!dateSpecificValue) return;
        computedFilterValue = formatDateToDisplay(dateSpecificValue);
      }
    }

    if (!computedFilterValue) return;

    const { label, displayValue } = getFilterLabelAndValue(
      newFilterType,
      computedFilterValue,
      { regions, districts, groups },
      recognitionTypes
    );

    const newChip: ActiveFilterChip = {
      id: `${newFilterType}-${Date.now()}`,
      type: newFilterType,
      label,
      value: displayValue
    };

    setActiveFilters(prev => [...prev.filter(f => f.type !== newFilterType), newChip]);
    setIsAddFilterModalOpen(false);
    setNewFilterValue('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setDateSpecificValue('');
  };

  // Format table rows
  const tableData = useMemo<BatchRowData[]>(() => {
    return batches.map(batch => {
      const batchMembers = members.filter(m => m.batch_id === batch.id);
      const memberCount = batchMembers.length;
      const formattedDate = formatBatchDate(batch.created_at);

      const regionObj = regions.find(r => r.id === batch.region_id);
      const districtObj = districts.find(d => d.id === batch.district_id);
      const groupObj = groups.find(g => g.id === batch.group_id);

      return {
        id: batch.id,
        batch,
        created_at: batch.created_at,
        formattedDate,
        regionName: regionObj ? regionObj.name : '-',
        districtName: districtObj ? districtObj.name : '-',
        groupName: groupObj ? groupObj.name : (batch.comment || '-'),
        recognitionName: resolveRecognitionName(batch.recognition_type),
        recognitionType: batch.recognition_type || '',
        memberCount
      };
    });
  }, [batches, members, regions, districts, groups, resolveRecognitionName]);

  // Filter table rows by active filters
  const filteredData = useMemo(() => {
    return tableData.filter(row => matchesActiveFilters(row, activeFilters));
  }, [tableData, activeFilters]);

  // TanStack Table columns definition
  const columns = useMemo<ColumnDef<BatchRowData>[]>(() => [
    {
      accessorKey: 'formattedDate',
      header: 'FECHA DE EMISIÓN',
      cell: info => <span className="font-medium text-neutral">{info.getValue() as string}</span>
    },
    {
      accessorKey: 'regionName',
      header: 'REGIÓN',
      cell: info => <span className="font-normal text-neutral/80">{info.getValue() as string}</span>
    },
    {
      accessorKey: 'districtName',
      header: 'DISTRITO',
      cell: info => <span className="font-normal text-neutral/80">{info.getValue() as string}</span>
    },
    {
      accessorKey: 'groupName',
      header: 'GRUPO',
      cell: info => (
        <span className="font-semibold text-neutral">{info.getValue() as string}</span>
      )
    },
    {
      accessorKey: 'recognitionName',
      header: 'RECONOCIMIENTO',
      cell: info => {
        const name = info.getValue() as string;
        const style = getRecognitionBadgeStyle(name);
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${style.pillClass}`}>
            {name}
          </span>
        );
      }
    },
    {
      accessorKey: 'memberCount',
      header: 'CANTIDAD',
      cell: info => (
        <span className="font-medium text-neutral">{info.getValue() as number} Miembros</span>
      )
    },
    {
      id: 'actions',
      header: 'ACCIONES',
      cell: ({ row, table }) => {
        const rowData = row.original;
        const isMenuOpen = openActionMenuId === rowData.id;
        const totalRows = table.getRowModel().rows.length;
        const isNearBottom = (row.index >= totalRows - 2 && totalRows > 1) || (totalRows <= 3 && row.index > 0);
        const dropdownPosition = isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1';

        return (
          <div className="relative inline-block font-sans">
            {/* Acciones 3-Dots Dropdown Button */}
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
              <div className={`absolute right-0 ${dropdownPosition} w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 font-sans`}>
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
                  {downloadingId === rowData.id ? 'Descargando...' : 'Descargar reconocimientos (PDF)'}
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
    }
  ], [openActionMenuId, downloadingId, navigate, handleDownloadPDF, handleDeleteClick]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  const currentPageRows = table.getRowModel().rows;
  const totalCount = filteredData.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans py-2">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-neutral text-white px-5 py-3 rounded-2xl shadow-xl border border-primary/20 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral tracking-tight">
            Listado de Lotes
          </h1>
          <p className="text-sm text-neutral/60 mt-1">
            Gestione y descargue los lotes de reconocimientos emitidos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/lotes/rapido')}
            icon={<Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />}
            className="shadow-sm flex-shrink-0"
          >
            Emisión Rápida
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/lotes/nuevo')}
            icon={<Plus size={18} />}
            className="shadow-sm flex-shrink-0"
          >
            Nuevo Lote
          </Button>
        </div>
      </div>

      {/* Filtros Activos Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-neutral mr-2">Filtros activos</span>
          {activeFilters.map(chip => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#f0eee9] text-neutral/80 border border-gray-200"
            >
              <span>{chip.label}: {chip.value}</span>
              <button
                type="button"
                onClick={() => removeFilter(chip.id)}
                className="hover:text-red-600 transition-colors focus:outline-none"
                aria-label={`Eliminar filtro ${chip.label}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}

          {activeFilters.length === 0 && (
            <span className="text-xs text-neutral/40 italic">Ningún filtro aplicado</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setNewFilterValue('');
            setDateFilterMode('predefined');
            setDatePredefinedValue('Este Año');
            setDateRangeStart('');
            setDateRangeEnd('');
            setDateSpecificValue('');
            setIsAddFilterModalOpen(true);
          }}
          className="inline-flex items-center gap-1 text-primary font-bold text-sm hover:text-primary/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir Filtro
        </button>
      </div>

      {/* Batches Data Table */}
      <div className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[260px] pb-12">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-gray-200 bg-[#faf8f5]">
                {table.getHeaderGroups().map(headerGroup => (
                  headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-xs font-extrabold text-neutral/70 uppercase tracking-wider"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {renderBatchTableRows(loading, currentPageRows, columns.length)}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination Controls */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between text-xs font-semibold text-neutral/60">
          <div>
            Mostrando {currentPageRows.length} de {totalCount} lotes
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
      </div>

      {/* Modal: Confirmar Eliminación de Lote */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !deleting && setIsDeleteModalOpen(false)} className="max-w-md">
        <ModalHeader onClose={() => !deleting && setIsDeleteModalOpen(false)}>
          Eliminar Lote
        </ModalHeader>
        <ModalBody className="space-y-3">
          <p className="text-sm text-neutral">
            ¿Está seguro de que desea eliminar el lote{' '}
            <span className="font-bold">#{batchToDelete?.id}</span>
            {batchToDelete?.groupName && batchToDelete.groupName !== '-' ? ` (${batchToDelete.groupName})` : ''} y todos sus miembros asociados?
          </p>
          <p className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-200">
            Esta acción no se puede deshacer y eliminará permanentemente los datos del lote y sus registros de miembros asociados.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
          >
            {deleting ? 'Eliminando...' : 'Eliminar Lote'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal: Añadir Filtro */}
      <Modal isOpen={isAddFilterModalOpen} onClose={() => setIsAddFilterModalOpen(false)} className="max-w-md">
        <form onSubmit={handleAddFilter} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <ModalHeader onClose={() => setIsAddFilterModalOpen(false)}>
            Añadir Filtro al Listado
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div>
              <label htmlFor="filter-type-select" className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral">
                Tipo de Filtro
              </label>
              <select
                id="filter-type-select"
                value={newFilterType}
                onChange={e => {
                  setNewFilterType(e.target.value as 'date' | 'region' | 'district' | 'group' | 'recognition');
                  setNewFilterValue('');
                }}
                className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="region">Región Scout</option>
                <option value="district">Distrito Scout</option>
                <option value="group">Grupo Scout</option>
                <option value="recognition">Tipo de Reconocimiento</option>
                <option value="date">Fecha / Período</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-value-select" className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral">
                Valor del Filtro
              </label>
              {newFilterType === 'region' && (
                <select
                  id="filter-value-select"
                  value={newFilterValue}
                  onChange={e => setNewFilterValue(e.target.value)}
                  className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                >
                  <option value="">Seleccione una región</option>
                  {regions.map(r => (
                    <option key={r.id} value={String(r.id)}>{r.name}</option>
                  ))}
                </select>
              )}

              {newFilterType === 'district' && (
                <select
                  id="filter-value-select"
                  value={newFilterValue}
                  onChange={e => setNewFilterValue(e.target.value)}
                  className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                >
                  <option value="">Seleccione un distrito</option>
                  {districts.map(d => (
                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                  ))}
                </select>
              )}

              {newFilterType === 'group' && (
                <select
                  id="filter-value-select"
                  value={newFilterValue}
                  onChange={e => setNewFilterValue(e.target.value)}
                  className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                >
                  <option value="">Seleccione un grupo scout</option>
                  {groups.map(g => (
                    <option key={g.id} value={String(g.id)}>{g.name}</option>
                  ))}
                </select>
              )}

              {newFilterType === 'recognition' && (
                <select
                  id="filter-value-select"
                  value={newFilterValue}
                  onChange={e => setNewFilterValue(e.target.value)}
                  className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                >
                  <option value="">Seleccione un reconocimiento</option>
                  {(recognitionTypes.length > 0 ? recognitionTypes : RECOGNITION_TYPES).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}

              {newFilterType === 'date' && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="date-mode-select" className="block text-xs font-semibold mb-1 text-neutral/70">
                      Modalidad
                    </label>
                    <select
                      id="date-mode-select"
                      value={dateFilterMode}
                      onChange={e => setDateFilterMode(e.target.value as 'predefined' | 'range' | 'specific')}
                      className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="predefined">Período predefinido</option>
                      <option value="range">Rango de fechas</option>
                      <option value="specific">Fecha específica</option>
                    </select>
                  </div>

                  {dateFilterMode === 'predefined' && (
                    <div>
                      <label htmlFor="date-predefined-select" className="block text-xs font-semibold mb-1 text-neutral/70">
                        Período
                      </label>
                      <select
                        id="date-predefined-select"
                        value={datePredefinedValue}
                        onChange={e => setDatePredefinedValue(e.target.value)}
                        className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        required
                      >
                        <option value="Este Año">Este Año</option>
                        <option value="Últimos 30 días">Últimos 30 días</option>
                        <option value="Últimos 90 días">Últimos 90 días</option>
                        <option value="Este Mes">Este Mes</option>
                        <option value="Todo el histórico">Todo el histórico</option>
                      </select>
                    </div>
                  )}

                  {dateFilterMode === 'range' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="date-start-input" className="block text-xs font-semibold mb-1 text-neutral/70">
                          Fecha Inicio
                        </label>
                        <input
                          id="date-start-input"
                          type="date"
                          value={dateRangeStart}
                          onChange={e => setDateRangeStart(e.target.value)}
                          className="w-full rounded-field px-3 py-2 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="date-end-input" className="block text-xs font-semibold mb-1 text-neutral/70">
                          Fecha Fin
                        </label>
                        <input
                          id="date-end-input"
                          type="date"
                          value={dateRangeEnd}
                          onChange={e => setDateRangeEnd(e.target.value)}
                          className="w-full rounded-field px-3 py-2 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {dateFilterMode === 'specific' && (
                    <div>
                      <label htmlFor="date-specific-input" className="block text-xs font-semibold mb-1 text-neutral/70">
                        Fecha
                      </label>
                      <input
                        id="date-specific-input"
                        type="date"
                        value={dateSpecificValue}
                        onChange={e => setDateSpecificValue(e.target.value)}
                        className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        required
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddFilterModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                newFilterType === 'date'
                  ? dateFilterMode === 'predefined'
                    ? !datePredefinedValue
                    : dateFilterMode === 'range'
                      ? !dateRangeStart || !dateRangeEnd
                      : !dateSpecificValue
                  : !newFilterValue
              }
            >
              Aplicar Filtro
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
};

export default BatchList;
