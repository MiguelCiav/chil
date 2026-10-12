import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender
} from '@tanstack/react-table';
import {
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Zap,
  GitMerge
} from 'lucide-react';

import { Button } from '../../../components/Button';
import {
  useWalkthrough,
  WalkthroughOverlay,
  WalkthroughHelpButton
} from '../../../components/walkthrough';
import {
  getAllBatches,
  getBatchById,
  getAllMembers,
  getMembersByBatchId,
  getHierarchyData,
  deleteBatch,
  getRecognitionName
} from '../api';
import {
  generateBatchCertificatesZip,
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
import {
  FilterType,
  DateFilterMode,
  PredefinedPeriod,
  BatchRowData,
  BATCH_LIST_TOUR_STEPS,
  formatBatchDate,
  matchesActiveFilters,
  createBatchListColumns,
  renderBatchTableRows,
  AddFilterModal,
  DeleteBatchModal,
  MergeBatchesModal,
  BatchMergeOption
} from './list';

export type { FilterType, DateFilterMode, PredefinedPeriod };

export const BatchList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    isOpen: isTourOpen,
    currentStep,
    currentStepIndex,
    totalSteps,
    targetRect,
    startTour,
    nextStep,
    prevStep,
    skipTour
  } = useWalkthrough({
    tourId: 'batch-list-tour',
    steps: BATCH_LIST_TOUR_STEPS,
    autoStart: false,
    userId: user?.uid
  });

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

  // Row selection state & Merge Batches modal state
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

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

      const fileName = await generateBatchCertificatesZip({
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
      alert("Error al generar los reconocimientos en ZIP.");
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

  const handleApplyFilter = (newChip: ActiveFilterChip) => {
    setActiveFilters(prev => [...prev.filter(f => f.type !== newChip.type), newChip]);
  };

  // Format table rows
  const tableData = useMemo<BatchRowData[]>(() => {
    return batches.map(batch => {
      const region = regions.find(r => r.id === batch.region_id);
      const district = districts.find(d => d.id === batch.district_id);
      const group = groups.find(g => g.id === batch.group_id);
      const batchMembers = members.filter(m => m.batch_id === batch.id);

      return {
        id: batch.id,
        batch,
        created_at: batch.created_at,
        formattedDate: formatBatchDate(batch.created_at),
        regionName: region ? region.name : (batch.region_id === 0 ? 'No aplica' : '-'),
        districtName: district ? district.name : (batch.district_id === 0 ? 'No aplica' : '-'),
        groupName: group ? group.name : (batch.group_id === 0 ? (batchMembers.some(m => m.group_id) ? 'Multigrupo' : 'No aplica') : '-'),
        recognitionName: resolveRecognitionName(batch.recognition_type),
        recognitionType: batch.recognition_type ?? '',
        memberCount: batchMembers.length
      };
    });
  }, [batches, members, regions, districts, groups, resolveRecognitionName]);

  const filteredData = useMemo(() => {
    return tableData.filter(row => matchesActiveFilters(row, activeFilters));
  }, [tableData, activeFilters]);

  // TanStack Table columns definition
  const columns = useMemo(
    () =>
      createBatchListColumns({
        openActionMenuId,
        setOpenActionMenuId,
        navigate,
        handleDownloadPDF,
        handleDeleteClick,
        downloadingId
      }),
    [openActionMenuId, downloadingId, navigate, handleDownloadPDF, handleDeleteClick]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      rowSelection
    },
    onRowSelectionChange: setRowSelection,
    getRowId: row => String(row.id),
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

  // Selected batches for merging
  const selectedBatches = useMemo<BatchMergeOption[]>(() => {
    const selectedIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    return selectedIds
      .map(id => {
        const row = tableData.find(r => String(r.id) === id);
        if (!row) return null;
        return {
          id: row.id,
          batch: row.batch,
          created_at: row.created_at,
          formattedDate: row.formattedDate,
          groupName: row.groupName,
          recognitionName: row.recognitionName,
          memberCount: row.memberCount
        };
      })
      .filter((b): b is BatchMergeOption => b !== null);
  }, [rowSelection, tableData]);

  const handleMergeSuccess = useCallback(async (newBatch: Batch) => {
    // 1. Show success toast
    setToastMessage(`¡Lotes fusionados exitosamente en el Lote #${newBatch.id}!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);

    // 2. Clear selection and close modal
    setRowSelection({});
    setIsMergeModalOpen(false);

    // 3. Update local state: remove merged batch IDs and add new batch
    const mergedIds = selectedBatches.map(b => b.id);
    setBatches(prev => [newBatch, ...prev.filter(b => !mergedIds.includes(b.id))]);

    // 4. Refresh members to have updated batch_id
    try {
      const refreshedMembers = await getAllMembers(user?.uid);
      setMembers(refreshedMembers);
    } catch (err) {
      console.error('Error refreshing members after merge:', err);
    }
  }, [selectedBatches, user?.uid]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans py-2">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-neutral text-white px-5 py-3 rounded-2xl shadow-xl border border-primary/20 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div data-walkthrough="batch-list-header">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight">
              Listado de Lotes
            </h1>
            <WalkthroughHelpButton onClick={() => startTour()} />
          </div>
          <p className="text-xs sm:text-sm text-neutral/70 mt-1">
            Gestione y descargue los lotes de reconocimientos emitidos.
          </p>
        </div>

        <div data-walkthrough="batch-list-actions" className="flex items-center gap-3">
          {selectedBatches.length >= 2 && (
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsMergeModalOpen(true)}
              icon={<GitMerge className="w-4 h-4" />}
              className="flex-shrink-0 animate-fade-in"
            >
              Fusionar lotes ({selectedBatches.length})
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/lotes/rapido')}
            icon={<Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />}
            className="flex-shrink-0"
          >
            Emisión Rápida
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/lotes/nuevo')}
            icon={<Plus size={18} />}
            className="flex-shrink-0"
          >
            Nuevo Lote
          </Button>
        </div>
      </div>

      {/* Filtros Activos Bar */}
      <div data-walkthrough="batch-list-filters" className="flex flex-wrap items-center justify-between gap-3 pt-2">
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
          onClick={() => setIsAddFilterModalOpen(true)}
          className="inline-flex items-center gap-1 text-primary font-bold text-sm hover:text-primary/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir Filtro
        </button>
      </div>

      {/* Batches Data Table */}
      <div data-walkthrough="batch-list-table" className="w-full border border-primary/20 rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto min-h-[260px] pb-12">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-primary/10 border-b border-primary/20">
                {table.getHeaderGroups().map(headerGroup => (
                  headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
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
      <DeleteBatchModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        batch={batchToDelete}
        deleting={deleting}
      />

      {/* Modal: Añadir Filtro */}
      <AddFilterModal
        isOpen={isAddFilterModalOpen}
        onClose={() => setIsAddFilterModalOpen(false)}
        onApplyFilter={handleApplyFilter}
        regions={regions}
        districts={districts}
        groups={groups}
        recognitionTypes={recognitionTypes}
      />

      {/* Modal: Fusionar Lotes */}
      <MergeBatchesModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        selectedBatches={selectedBatches}
        onMergeSuccess={handleMergeSuccess}
        userId={user?.uid}
      />

      {/* Walkthrough Interactive Guide Overlay */}
      <WalkthroughOverlay
        isOpen={isTourOpen}
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        targetRect={targetRect}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
        onClose={skipTour}
      />
    </div>
  );
};

export default BatchList;
