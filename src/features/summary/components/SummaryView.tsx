import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  Row
} from '@tanstack/react-table';
import { Download, AlertCircle, RotateCcw } from 'lucide-react';

import {
  Card,
  CardBody,
  Button,
  Toast,
  SearchInput,
  Select,
  Field,
  ErrorAlert,
  DataTable,
  Pagination
} from '../../../components';
import { MemberStatusBadge, HierarchyFilterSelects } from '../../../domain/components';
import {
  getAllBatches,
  getAllMembers,
  getHierarchyData,
  getRecognitionBadgeStyle,
  getRecognitionName
} from '../../batches/api';
import {
  getAllRecognitionTypes,
  RecognitionType
} from '../../recognitions';
import {
  Batch,
  ScoutMember,
  Region,
  District,
  ScoutGroup,
  getUnitBadge,
  getUnitLabel
} from '../../../types';
import { SummaryRowData } from '../types';
import { exportToExcel } from '../utils/excelExport';
import {
  MemberTypeFilter,
  RegistryStatusFilter,
  DatePeriodFilter,
  SummaryFilterOptions,
  SummaryFilterValues,
  INITIAL_SUMMARY_FILTER_VALUES,
  hasActiveSummaryFilters,
  formatBatchDate,
  formatBatchCode,
  getMemberStatusLabel,
  getMemberTypeLabel,
  resolveHierarchyName,
  getFilteredSummaryRows
} from '../utils/summaryHelpers';
import { useAuth } from '../../auth';
import { resolveMemberHierarchy } from '../../../utils/memberHierarchy';

export type {
  MemberTypeFilter,
  RegistryStatusFilter,
  DatePeriodFilter,
  SummaryFilterOptions
};

function renderRecognitionBadge(name: string) {
  const style = getRecognitionBadgeStyle(name);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.pillClass}`}>
      {name}
    </span>
  );
}

function renderUnitBadgeCell(unit?: string) {
  const badge = getUnitBadge(unit as Parameters<typeof getUnitBadge>[0]);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.badgeClass}`}>
      {badge.label}
    </span>
  );
}

function renderIssueDateCell(info: { getValue: () => unknown }) {
  return <span className="font-medium text-neutral">{info.getValue() as string}</span>;
}

function renderBatchCodeCell(info: { getValue: () => unknown }) {
  return (
    <span className="font-mono text-xs font-semibold text-primary">
      {info.getValue() as string}
    </span>
  );
}

function renderRecognitionCell(info: { getValue: () => unknown }) {
  return renderRecognitionBadge(info.getValue() as string);
}

function renderIdentityCell(info: { getValue: () => unknown }) {
  return (
    <span className="font-mono font-medium text-neutral">{info.getValue() as string}</span>
  );
}

function renderFirstNameCell(info: { getValue: () => unknown }) {
  return <span className="text-neutral font-medium">{info.getValue() as string}</span>;
}

function renderLastNameCell(info: { getValue: () => unknown }) {
  return <span className="text-neutral">{info.getValue() as string}</span>;
}

function renderUnitCell({ row }: { row: Row<SummaryRowData> }) {
  return renderUnitBadgeCell(row.original.unit);
}

function renderMemberTypeCell(info: { getValue: () => unknown }) {
  return <span className="text-neutral/80">{info.getValue() as string}</span>;
}

function renderStatusCell({ row }: { row: Row<SummaryRowData> }) {
  return <MemberStatusBadge status={row.original.status} />;
}

function renderRecognitionCodeCell(info: { getValue: () => unknown }) {
  return (
    <span className="font-mono text-xs text-neutral/80 font-medium">{info.getValue() as string}</span>
  );
}

function renderRegionCell(info: { getValue: () => unknown }) {
  return <span className="text-neutral/80">{info.getValue() as string}</span>;
}

function renderDistrictCell(info: { getValue: () => unknown }) {
  return <span className="text-neutral/80">{info.getValue() as string}</span>;
}

function renderGroupCell(info: { getValue: () => unknown }) {
  return <span className="font-semibold text-neutral">{info.getValue() as string}</span>;
}

const SUMMARY_COLUMNS: ColumnDef<SummaryRowData>[] = [
  { accessorKey: 'issueDate', header: 'FECHA', cell: renderIssueDateCell },
  { accessorKey: 'batchCode', header: 'LOTE', cell: renderBatchCodeCell },
  { accessorKey: 'recognitionName', header: 'RECONOCIMIENTO', cell: renderRecognitionCell },
  { accessorKey: 'identity', header: 'CÉDULA', cell: renderIdentityCell },
  { accessorKey: 'firstName', header: 'NOMBRE', cell: renderFirstNameCell },
  { accessorKey: 'lastName', header: 'APELLIDO', cell: renderLastNameCell },
  { accessorKey: 'unitLabel', header: 'UNIDAD', cell: renderUnitCell },
  { accessorKey: 'memberTypeLabel', header: 'TIPO', cell: renderMemberTypeCell },
  { accessorKey: 'status', header: 'ESTATUS', cell: renderStatusCell },
  { accessorKey: 'recognitionCode', header: 'CÓDIGO REC.', cell: renderRecognitionCodeCell },
  { accessorKey: 'regionName', header: 'REGIÓN', cell: renderRegionCell },
  { accessorKey: 'districtName', header: 'DISTRITO', cell: renderDistrictCell },
  { accessorKey: 'groupName', header: 'GRUPO', cell: renderGroupCell }
];

export const SummaryView: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [recognitionTypes, setRecognitionTypes] = useState<RecognitionType[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<SummaryFilterValues>(INITIAL_SUMMARY_FILTER_VALUES);
  const updateFilter = useCallback(<K extends keyof SummaryFilterValues>(
    key: K,
    value: SummaryFilterValues[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Toast feedback state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const triggerToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    setShowToast(true);
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const loadSummaryData = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      getAllBatches(user?.uid),
      getAllMembers(user?.uid),
      getHierarchyData(),
      getAllRecognitionTypes(user?.uid)
    ])
      .then(([batchList, memberList, hierarchy, recTypes]) => {
        setBatches(batchList ?? []);
        setMembers(memberList ?? []);
        setRegions(hierarchy.regions ?? []);
        setDistricts(hierarchy.districts ?? []);
        setGroups(hierarchy.groups ?? []);
        setRecognitionTypes(recTypes ?? []);
      })
      .catch(err => {
        console.error('Error loading summary data:', err);
        setLoadError('No se pudo cargar el resumen general de reconocimientos.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.uid]);

  useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  const resolveRecognitionName = useCallback((recType?: string) => {
    if (!recType) return '-';
    const found = recognitionTypes.find(
      r => r.id === recType || r.name.toLowerCase() === recType.toLowerCase()
    );
    return found ? found.name : getRecognitionName(recType);
  }, [recognitionTypes]);

  // Master Flat Data Aggregation
  const flatData = useMemo<SummaryRowData[]>(() => {
    const batchMap = new Map<number, Batch>();
    batches.forEach(b => batchMap.set(b.id, b));

    return members.map((m, idx) => {
      const batch = m.batch_id !== undefined ? batchMap.get(m.batch_id) : undefined;
      const resolved = resolveMemberHierarchy(m, batch, { regions, districts, groups });

      const regionObj = regions.find(r => r.id === resolved.regionId);
      const districtObj = districts.find(d => d.id === resolved.districtId);
      const groupObj = groups.find(g => g.id === resolved.groupId);

      const recType = batch?.recognition_type;
      const recName = resolveRecognitionName(recType);

      const issueDate = batch?.created_at ? formatBatchDate(batch.created_at) : '-';
      const batchCode = batch ? formatBatchCode(batch.id, batch.created_at) : '#000';
      const unitLabel = getUnitLabel(m.unit);
      const memberTypeLabel = getMemberTypeLabel(m.member_type);
      const statusLabel = getMemberStatusLabel(m.status);

      const regionName = resolved.isNationalInstitutional
        ? 'Nacional'
        : resolveHierarchyName(resolved.regionId, regionObj?.name);
      const districtName = resolveHierarchyName(resolved.districtId, districtObj?.name);
      const groupName = resolveHierarchyName(resolved.groupId, groupObj?.name);

      const rawFullName = `${m.first_names ?? ''} ${m.last_names ?? ''}`.trim();
      const fullName = rawFullName.length > 0 ? rawFullName : '-';

      return {
        id: m.recognition_code ? `${m.recognition_code}-${batch?.id ?? '0'}` : `${m.identity}-${batch?.id ?? '0'}-${idx}`,
        issueDate,
        rawDate: batch?.created_at ?? '',
        batchId: batch?.id ?? 0,
        batchCode,
        recognitionId: recType ?? '',
        recognitionName: recName,
        identity: m.identity ?? '-',
        firstName: m.first_names ?? '',
        lastName: m.last_names ?? '',
        fullName,
        unit: m.unit,
        unitLabel,
        memberType: m.member_type,
        memberTypeLabel,
        status: m.status,
        statusLabel,
        exceptionalReason: m.exceptional_reason ?? '',
        recognitionCode: m.recognition_code ?? '-',
        regionId: resolved.regionId,
        districtId: resolved.districtId,
        groupId: resolved.groupId,
        isNationalInstitutional: resolved.isNationalInstitutional,
        regionName,
        districtName,
        groupName
      };
    });
  }, [batches, members, regions, districts, groups, resolveRecognitionName]);

  const filteredData = useMemo(() => {
    return getFilteredSummaryRows(flatData, {
      ...filters,
      regions,
      districts,
      groups
    });
  }, [flatData, filters, regions, districts, groups]);

  const hasActiveFilters = useMemo(() => hasActiveSummaryFilters(filters), [filters]);

  const handleResetFilters = () => {
    setFilters(INITIAL_SUMMARY_FILTER_VALUES);
  };

  const handleExportAll = () => {
    exportToExcel(flatData);
    triggerToast(`¡Todos los registros (${flatData.length}) han sido exportados exitosamente!`);
  };

  const handleExport = () => {
    exportToExcel(filteredData);
    triggerToast(`¡Registros exportados exitosamente (${filteredData.length})!`);
  };

  const table = useReactTable({
    data: filteredData,
    columns: SUMMARY_COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 25
      }
    }
  });

  const currentPageRows = table.getRowModel().rows;
  const totalCount = filteredData.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans py-2 relative">
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          variant="success"
          onDismiss={() => setShowToast(false)}
        />
      )}

      {/* Header with Title and Download Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight">
            Resumen General de Reconocimientos
          </h1>
          <p className="text-xs sm:text-sm text-neutral/75 mt-1">
            Consulta y exportación consolidada de todos los reconocimientos emitidos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant={hasActiveFilters ? 'outline' : 'primary'}
            onClick={handleExportAll}
            disabled={flatData.length === 0}
            icon={<Download className="w-4 h-4" />}
            className="whitespace-nowrap"
            aria-label="Exportar todo"
          >
            Exportar todo
          </Button>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="primary"
              onClick={handleExport}
              disabled={filteredData.length === 0}
              icon={<Download className="w-4 h-4" />}
              className="whitespace-nowrap"
              aria-label="Exportar filtrados"
            >
              Exportar filtrados
            </Button>
          )}
        </div>
      </div>

      {loadError && (
        <ErrorAlert variant="inline" message={loadError} onRetry={loadSummaryData} />
      )}

      {/* Filter Controls Bar */}
      <Card>
        <CardBody padding="sm" className="sm:p-5 space-y-4">
          <SearchInput
            size="sm"
            value={filters.searchTerm}
            onChange={e => updateFilter('searchTerm', e.target.value)}
            onClear={() => updateFilter('searchTerm', '')}
            placeholder="Buscar por nombre, cédula, lote, reconocimiento, código, región, distrito, grupo..."
            aria-label="Búsqueda global"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            <Select
              id="summary-filter-rec"
              label="Reconocimiento"
              size="sm"
              aria-label="Filtrar por reconocimiento"
              value={filters.selectedRecognition}
              onChange={e => updateFilter('selectedRecognition', e.target.value)}
            >
              <option value="">Todos los reconocimientos</option>
              {recognitionTypes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
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
              onRegionChange={val => updateFilter('selectedRegion', val)}
              onDistrictChange={val => updateFilter('selectedDistrict', val)}
              onGroupChange={val => updateFilter('selectedGroup', val)}
            />

            <Select
              id="summary-filter-unit"
              label="Unidad Scout"
              size="sm"
              aria-label="Filtrar por unidad"
              value={filters.selectedUnit}
              onChange={e => updateFilter('selectedUnit', e.target.value)}
            >
              <option value="">Todas las unidades</option>
              <option value="manada">Manada</option>
              <option value="tropa">Tropa</option>
              <option value="caminantes">Caminantes</option>
              <option value="clan">Clan</option>
              <option value="institucional">Institucional</option>
              <option value="no_scout">No scout</option>
            </Select>

            <Select
              id="summary-filter-member-type"
              label="Tipo de Miembro"
              size="sm"
              aria-label="Filtrar por tipo de miembro"
              value={filters.selectedMemberType}
              onChange={e => updateFilter('selectedMemberType', e.target.value as MemberTypeFilter)}
            >
              <option value="all">Todos los tipos</option>
              <option value="young">Jóvenes</option>
              <option value="adult">Adultos</option>
            </Select>

            <Select
              id="summary-filter-status"
              label="Estatus"
              size="sm"
              aria-label="Filtrar por estatus"
              value={filters.selectedStatus}
              onChange={e => updateFilter('selectedStatus', e.target.value as RegistryStatusFilter)}
            >
              <option value="all">Todos los estatus</option>
              <option value="active">Registro Válido</option>
              <option value="exceptional">Emisión Excepcional</option>
              <option value="pending">Registro Inválido</option>
            </Select>

            <Select
              id="summary-filter-period"
              label="Fecha / Período"
              size="sm"
              aria-label="Filtrar por período"
              value={filters.selectedDatePeriod}
              onChange={e => updateFilter('selectedDatePeriod', e.target.value as DatePeriodFilter)}
            >
              <option value="all">Todo el histórico</option>
              <option value="this-year">Este Año</option>
              <option value="this-month">Este Mes</option>
              <option value="last-30">Últimos 30 días</option>
              <option value="last-90">Últimos 90 días</option>
              <option value="custom">Rango Personalizado</option>
            </Select>

            <div className="flex items-end">
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  aria-label="Limpiar todos los filtros"
                  className="w-full text-red-700 border-red-300 hover:bg-red-50"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          {filters.selectedDatePeriod === 'custom' && (
            <div className="pt-2 border-t border-gray-100 flex flex-wrap items-end gap-3 text-xs">
              <div className="w-40">
                <Field
                  id="summary-custom-start"
                  label="Desde"
                  size="sm"
                  type="date"
                  value={filters.customStartDate}
                  onChange={e => updateFilter('customStartDate', e.target.value)}
                  aria-label="Fecha inicio personalizado"
                />
              </div>
              <div className="w-40">
                <Field
                  id="summary-custom-end"
                  label="Hasta"
                  size="sm"
                  type="date"
                  value={filters.customEndDate}
                  onChange={e => updateFilter('customEndDate', e.target.value)}
                  aria-label="Fecha fin personalizado"
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* TanStack Table Container */}
      <Card>
        <DataTable
          table={table}
          columnCount={SUMMARY_COLUMNS.length}
          bordered={false}
          loading={loading}
          loadingMessage="Cargando listado general de reconocimientos..."
          scrollContainerClassName="min-h-[300px]"
          emptyState={
            <div className="py-4 space-y-2">
              <AlertCircle className="w-8 h-8 text-neutral/75 mx-auto" aria-hidden="true" />
              <p className="font-semibold text-neutral">No se encontraron registros de reconocimientos.</p>
              <p className="text-xs text-neutral/75">
                Ajuste el término de búsqueda o modifique los filtros activos.
              </p>
            </div>
          }
        />

        <Pagination
          table={table}
          totalCount={totalCount}
          filteredCount={currentPageRows.length}
          itemLabel="registros"
          mode="summary"
          counterFormat="summary-total"
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </Card>
    </div>
  );
};

export default SummaryView;
