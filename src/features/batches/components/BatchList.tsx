import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table';
import {
  Plus,
  GitMerge,
  AlertCircle
} from 'lucide-react';

import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { DataTable } from '../../../components/DataTable';
import { ErrorAlert } from '../../../components/ErrorAlert';
import { Pagination } from '../../../components/Pagination';
import { Select } from '../../../components/Select';
import { Toast } from '../../../components/Toast';
import { buildCommonFilterBadges, FilterCard, HierarchyFilterSelects } from '../../../domain/components';
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
  getRecognitionName,
  RECOGNITION_TYPES
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
  ScoutGroup
} from '../types';
import { useAuth } from '../../auth';
import {
  CompletenessStatus,
  consolidateMergedGroupTokens,
  deriveBatchTerritorialProjection
} from '../utils/batchTerritorial';
import {
  BatchRowData,
  BatchListFilterValues,
  INITIAL_BATCH_LIST_FILTER_VALUES,
  hasActiveBatchListFilters,
  BATCH_LIST_TOUR_STEPS,
  formatBatchDate,
  getFilteredBatchRows,
  createBatchListColumns,
  MergeBatchesModal,
  BatchMergeOption
} from './list';
import {
  CertificateZipProgressModal,
  DeleteBatchModal
} from './shared';
import { useCertificateZipDownload } from '../hooks/useCertificateZipDownload';

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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Deletion modal state
  const [batchToDelete, setBatchToDelete] = useState<BatchRowData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Toast notification
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const zipDownload = useCertificateZipDownload();

  const triggerToast = useCallback((message: string, durationMs = 4000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    setShowToast(true);
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, durationMs);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Filter state
  const [filters, setFilters] = useState<BatchListFilterValues>(INITIAL_BATCH_LIST_FILTER_VALUES);
  const updateFilter = useCallback(
    <K extends keyof BatchListFilterValues>(key: K, value: BatchListFilterValues[K]) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    },
    []
  );
  const handleResetFilters = useCallback(() => {
    setFilters(INITIAL_BATCH_LIST_FILTER_VALUES);
  }, []);
  const hasActiveFilters = useMemo(() => hasActiveBatchListFilters(filters), [filters]);

  const recognitionOptions = useMemo(
    () => (recognitionTypes.length > 0 ? recognitionTypes : RECOGNITION_TYPES),
    [recognitionTypes]
  );

  const activeFilterBadges = useMemo(() => {
    const badges = buildCommonFilterBadges({
      recognition: {
        id: filters.selectedRecognition,
        options: recognitionOptions,
        onRemove: () => updateFilter('selectedRecognition', '')
      },
      region: {
        id: filters.selectedRegion,
        options: regions,
        onRemove: () =>
          setFilters(prev => ({
            ...prev,
            selectedRegion: '',
            selectedDistrict: '',
            selectedGroup: ''
          }))
      },
      district: {
        id: filters.selectedDistrict,
        options: districts,
        onRemove: () =>
          setFilters(prev => ({
            ...prev,
            selectedDistrict: '',
            selectedGroup: ''
          }))
      },
      group: {
        id: filters.selectedGroup,
        options: groups,
        onRemove: () => updateFilter('selectedGroup', '')
      },
      period: {
        value: filters.selectedDatePeriod,
        startDate: filters.customStartDate,
        endDate: filters.customEndDate,
        onRemove: () =>
          setFilters(prev => ({
            ...prev,
            selectedDatePeriod: 'all',
            customStartDate: '',
            customEndDate: ''
          }))
      }
    });

    if (filters.selectedCompleteness) {
      const completenessLabels: Record<CompletenessStatus, string> = {
        complete: 'Todos registrados',
        pending: 'Registros pendientes',
        empty: 'Sin miembros'
      };
      badges.push({
        id: 'completeness',
        label: 'Completitud',
        value: completenessLabels[filters.selectedCompleteness],
        onRemove: () => updateFilter('selectedCompleteness', '')
      });
    }

    return badges;
  }, [filters, recognitionOptions, regions, districts, groups, updateFilter]);

  // Row selection state & Merge Batches modal state
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  // Dropdown action menu state per row
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);

  const loadBatchesData = useCallback(() => {
    setLoading(true);
    setLoadError(null);
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
        setLoadError('No se pudo cargar el listado de lotes.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.uid]);

  useEffect(() => {
    loadBatchesData();
  }, [loadBatchesData]);

  const resolveRecognitionName = useCallback((recType?: string) => {
    if (!recType) return '-';
    const found = recognitionTypes.find(
      r => r.id === recType || r.name.toLowerCase() === recType.toLowerCase()
    );
    return found ? found.name : getRecognitionName(recType);
  }, [recognitionTypes]);

  const { startDownload } = zipDownload;

  const handleDownloadPDF = useCallback(
    (batchId: number) => {
      void startDownload(
        async ({ onProgress, signal }) => {
          setDownloadingId(batchId);
          try {
            const targetBatch = batches.find(b => b.id === batchId) || (await getBatchById(batchId));
            if (!targetBatch) throw new Error('Lote no encontrado');
            if (signal.aborted) {
              throw new DOMException('Aborted', 'AbortError');
            }

            let batchMembers = members.filter(m => m.batch_id === batchId);
            if (batchMembers.length === 0) {
              batchMembers = await getMembersByBatchId(batchId);
              if (signal.aborted) {
                throw new DOMException('Aborted', 'AbortError');
              }
            }

            let recType: RecognitionType | null = null;
            if (targetBatch.recognition_type) {
              const matchedCatalog = recognitionTypes.find(
                r =>
                  r.id === targetBatch.recognition_type ||
                  r.name.toLowerCase() === targetBatch.recognition_type?.toLowerCase()
              );
              recType = await getRecognitionTypeById(
                matchedCatalog?.id ?? targetBatch.recognition_type
              );
              if (signal.aborted) {
                throw new DOMException('Aborted', 'AbortError');
              }
            }

            return await generateBatchCertificatesZip({
              batch: targetBatch,
              members: batchMembers,
              recognition: recType,
              hierarchy: { regions, districts, groups },
              onProgress,
              signal
            });
          } finally {
            setDownloadingId(null);
          }
        },
        {
          scopeLabel: `Lote #${batchId}`,
          initialTotal: 0,
          onSuccess: (fileName) => {
            triggerToast(`Reconocimientos descargados: ${fileName}`, 4000);
          },
          onError: (err) => {
            console.error('Error downloading PDF:', err);
            alert('Error al generar los reconocimientos en ZIP.');
          }
        }
      );
    },
    [startDownload, batches, members, recognitionTypes, regions, districts, groups, triggerToast]
  );

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
      triggerToast('Lote eliminado exitosamente', 3000);
    } catch (err) {
      console.error("Error deleting batch:", err);
      alert("Error al eliminar el lote.");
    } finally {
      setDeleting(false);
    }
  };

  // Group members by batch ID (shared by tableData and MergeBatchesModal preview)
  const membersByBatchId = useMemo(() => {
    const grouped = new Map<number, ScoutMember[]>();
    for (const member of members) {
      if (member.batch_id === undefined) continue;
      const list = grouped.get(member.batch_id);
      if (list) {
        list.push(member);
      } else {
        grouped.set(member.batch_id, [member]);
      }
    }
    return grouped;
  }, [members]);

  // Format table rows
  const tableData = useMemo<BatchRowData[]>(() => {
    const hierarchy = { regions, districts, groups };

    return batches.map(batch => {
      const batchMembers = membersByBatchId.get(batch.id) ?? [];
      const projection = deriveBatchTerritorialProjection(batchMembers, batch, hierarchy);

      return {
        id: batch.id,
        batch,
        created_at: batch.created_at,
        formattedDate: formatBatchDate(batch.created_at),
        regionTokens: projection.regionTokens,
        districtTokens: projection.districtTokens,
        groupTokens: projection.groupTokens,
        completenessStatus: projection.completenessStatus,
        completenessLabel: projection.completenessLabel,
        pendingCount: projection.pendingCount,
        eligibleCount: projection.eligibleCount,
        recognitionName: resolveRecognitionName(batch.recognition_type),
        recognitionType: batch.recognition_type ?? '',
        memberCount: projection.memberCount
      };
    });
  }, [batches, membersByBatchId, regions, districts, groups, resolveRecognitionName]);

  const filteredData = useMemo(() => {
    return getFilteredBatchRows(tableData, filters);
  }, [tableData, filters]);

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

  const totalCount = filteredData.length;

  // Selected batches for merging
  const selectedBatches = useMemo<BatchMergeOption[]>(() => {
    const selectedIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    return selectedIds
      .map((id): BatchMergeOption | null => {
        const row = tableData.find(r => String(r.id) === id);
        if (!row) return null;
        return {
          id: row.id,
          batch: row.batch,
          created_at: row.created_at,
          formattedDate: row.formattedDate,
          groupTokens: row.groupTokens,
          groupName: consolidateMergedGroupTokens([row.groupTokens]),
          recognitionName: row.recognitionName,
          memberCount: row.memberCount,
          members: membersByBatchId.get(row.id) ?? []
        };
      })
      .filter((b): b is BatchMergeOption => b !== null);
  }, [rowSelection, tableData, membersByBatchId]);

  const handleMergeSuccess = useCallback(async (newBatch: Batch) => {
    // 1. Show success toast
    triggerToast(`¡Lotes fusionados exitosamente en el Lote #${newBatch.id}!`, 4000);

    // 2. Clear selection and close modal
    setRowSelection({});
    setIsMergeModalOpen(false);

    // 3. Update local state: remove merged batch IDs and add new batch
    const mergedIds = new Set(selectedBatches.map(b => b.id));
    setBatches(prev => [newBatch, ...prev.filter(b => !mergedIds.has(b.id))]);

    // 4. Refresh members to have updated batch_id
    try {
      const refreshedMembers = await getAllMembers(user?.uid);
      setMembers(refreshedMembers);
    } catch (err) {
      console.error('Error refreshing members after merge:', err);
    }
  }, [selectedBatches, triggerToast, user?.uid]);

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
        <div data-walkthrough="batch-list-header">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight">
              Listado de Lotes
            </h1>
            <WalkthroughHelpButton onClick={() => startTour()} />
          </div>
          <p className="text-xs sm:text-sm text-neutral/75 mt-1">
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
            variant="primary"
            onClick={() => {
              void navigate('/lotes/nuevo');
            }}
            icon={<Plus size={18} />}
            className="flex-shrink-0"
          >
            Nuevo Lote
          </Button>
        </div>
      </div>

      {loadError && (
        <ErrorAlert
          variant="inline"
          message={loadError}
          onRetry={loadBatchesData}
        />
      )}

      {/* Filter Controls Card */}
      <FilterCard
        dataWalkthrough="batch-list-filters"
        searchId="batch-list-search"
        searchValue={filters.searchTerm}
        onSearchChange={val => updateFilter('searchTerm', val)}
        searchPlaceholder="Buscar por lote, comentario, reconocimiento, región, distrito, grupo..."
        searchAriaLabel="Búsqueda de lotes"
        period={filters.selectedDatePeriod}
        onPeriodChange={val => updateFilter('selectedDatePeriod', val)}
        periodSelectId="batch-list-filter-period"
        customStartDate={filters.customStartDate}
        customEndDate={filters.customEndDate}
        onCustomStartDateChange={val => updateFilter('customStartDate', val)}
        onCustomEndDateChange={val => updateFilter('customEndDate', val)}
        customStartId="batch-list-custom-start"
        customEndId="batch-list-custom-end"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
        resetAriaLabel="Limpiar filtros"
        activeFilters={activeFilterBadges}
      >
        <Select
          id="batch-list-filter-rec"
          label="Reconocimiento"
          size="sm"
          aria-label="Filtrar por reconocimiento"
          value={filters.selectedRecognition}
          onChange={e => updateFilter('selectedRecognition', e.target.value)}
        >
          <option value="">Todos los reconocimientos</option>
          {recognitionOptions.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>

        <HierarchyFilterSelects
          regions={regions}
          districts={districts}
          groups={groups}
          regionId={filters.selectedRegion}
          districtId={filters.selectedDistrict}
          groupId={filters.selectedGroup}
          showGroup
          includeNoAplicaAlways
          includeNoScoutInGroup
          onRegionChange={val => updateFilter('selectedRegion', val)}
          onDistrictChange={val => updateFilter('selectedDistrict', val)}
          onGroupChange={val => updateFilter('selectedGroup', val)}
        />

        <Select
          id="batch-list-filter-completeness"
          label="Completitud"
          size="sm"
          aria-label="Filtrar por completitud"
          value={filters.selectedCompleteness}
          onChange={e => updateFilter('selectedCompleteness', e.target.value as '' | CompletenessStatus)}
        >
          <option value="">Todos los estados</option>
          <option value="complete">Todos registrados</option>
          <option value="pending">Registros pendientes</option>
          <option value="empty">Sin miembros</option>
        </Select>
      </FilterCard>

      {/* Batches Data Table */}
      <Card data-walkthrough="batch-list-table">
        <DataTable
          table={table}
          columnCount={columns.length}
          bordered={false}
          loading={loading}
          loadingMessage="Cargando listado de lotes..."
          scrollContainerClassName="min-h-[260px] pb-12"
          emptyState={
            <div className="space-y-2">
              <AlertCircle className="w-8 h-8 text-neutral/75 mx-auto" aria-hidden="true" />
              <p className="font-semibold text-neutral">No se encontraron lotes registrados.</p>
              <p className="text-xs text-neutral/75">Cree un nuevo lote o modifique los filtros activos.</p>
            </div>
          }
        />

        {/* Table Footer with Pagination Controls */}
        <Pagination
          table={table}
          totalCount={totalCount}
          itemLabel="lotes"
          mode="summary"
          counterFormat="count"
        />
      </Card>

      {/* Modal: Confirmar Eliminación de Lote */}
      <DeleteBatchModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        batch={batchToDelete}
        deleting={deleting}
      />

      {/* Modal: Fusionar Lotes */}
      <MergeBatchesModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        selectedBatches={selectedBatches}
        onMergeSuccess={handleMergeSuccess}
        userId={user?.uid}
      />

      {/* Modal: Progreso de Generación ZIP */}
      <CertificateZipProgressModal
        isOpen={zipDownload.isOpen}
        phase={zipDownload.phase}
        progress={zipDownload.progress}
        isCancelling={zipDownload.isCancelling}
        scopeLabel={zipDownload.scopeLabel}
        onCancel={zipDownload.cancelDownload}
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
