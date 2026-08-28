import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
  Row
} from '@tanstack/react-table';
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

import { Button } from '../../../components/Button';
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
} from '../../batches/types';
import { SummaryRowData } from '../types';
import { exportToExcel } from '../utils/excelExport';
import { useAuth } from '../../auth';

function formatBatchDate(dateStr?: string): string {
  if (!dateStr) return 'Fecha no disponible';
  const dateObj = new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) {
    return 'Fecha no disponible';
  }
  return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatBatchCode(batchId: number, created_at?: string): string {
  const dateObj = created_at ? new Date(created_at) : new Date();
  const year = Number.isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear();
  return `LT-${year}-${String(batchId).padStart(3, '0')}`;
}

function matchesCustomDateRange(itemDate: Date, startDate: string, endDate: string): boolean {
  if (startDate && endDate) {
    const sDate = new Date(`${startDate}T00:00:00.000`);
    const eDate = new Date(`${endDate}T23:59:59.999`);
    return itemDate >= sDate && itemDate <= eDate;
  }
  if (startDate) {
    const sDate = new Date(`${startDate}T00:00:00.000`);
    return itemDate >= sDate;
  }
  if (endDate) {
    const eDate = new Date(`${endDate}T23:59:59.999`);
    return itemDate <= eDate;
  }
  return true;
}

function matchesRelativePeriod(itemDate: Date, period: string): boolean {
  const now = new Date();
  if (period === 'this-year') {
    return itemDate.getFullYear() === now.getFullYear();
  }
  if (period === 'this-month') {
    return (
      itemDate.getFullYear() === now.getFullYear() &&
      itemDate.getMonth() === now.getMonth()
    );
  }
  if (period === 'last-30') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    return itemDate >= thirtyDaysAgo && itemDate <= now;
  }
  if (period === 'last-90') {
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    ninetyDaysAgo.setHours(0, 0, 0, 0);
    return itemDate >= ninetyDaysAgo && itemDate <= now;
  }
  return true;
}

function matchesDateRange(createdAt: string, period: string, startDate: string, endDate: string): boolean {
  if (!createdAt) return false;
  const itemDate = new Date(createdAt);
  if (Number.isNaN(itemDate.getTime())) return false;

  if (period === 'all') return true;
  if (period === 'custom') {
    return matchesCustomDateRange(itemDate, startDate, endDate);
  }
  return matchesRelativePeriod(itemDate, period);
}

function matchesSummarySearchTerm(row: SummaryRowData, term: string): boolean {
  if (!term) return true;
  const cleanTerm = term.toLowerCase();
  return (
    row.fullName.toLowerCase().includes(cleanTerm) ||
    row.identity.toLowerCase().includes(cleanTerm) ||
    row.batchCode.toLowerCase().includes(cleanTerm) ||
    String(row.batchId).includes(cleanTerm) ||
    row.recognitionName.toLowerCase().includes(cleanTerm) ||
    row.recognitionCode.toLowerCase().includes(cleanTerm) ||
    row.regionName.toLowerCase().includes(cleanTerm) ||
    row.districtName.toLowerCase().includes(cleanTerm) ||
    row.groupName.toLowerCase().includes(cleanTerm) ||
    row.unitLabel.toLowerCase().includes(cleanTerm) ||
    row.memberTypeLabel.toLowerCase().includes(cleanTerm) ||
    row.statusLabel.toLowerCase().includes(cleanTerm)
  );
}

interface SummaryFilterOptions {
  searchTerm: string;
  selectedRecognition: string;
  selectedRegion: string;
  selectedDistrict: string;
  selectedGroup: string;
  selectedUnit: string;
  selectedMemberType: 'all' | 'young' | 'adult';
  selectedStatus: 'all' | 'active' | 'pending' | 'exceptional';
  selectedDatePeriod: 'all' | 'this-year' | 'this-month' | 'last-30' | 'last-90' | 'custom';
  customStartDate: string;
  customEndDate: string;
  regions: Region[];
  districts: District[];
  groups: ScoutGroup[];
}

function matchesRecognitionFilter(row: SummaryRowData, selectedRecognition: string): boolean {
  if (!selectedRecognition) return true;
  return (
    row.recognitionId === selectedRecognition ||
    row.recognitionName.toLowerCase() === selectedRecognition.toLowerCase()
  );
}

function matchesHierarchyFilters(
  row: SummaryRowData,
  filters: Pick<SummaryFilterOptions, 'selectedRegion' | 'selectedDistrict' | 'selectedGroup' | 'regions' | 'districts' | 'groups'>
): boolean {
  const { selectedRegion, selectedDistrict, selectedGroup, regions, districts, groups } = filters;

  if (selectedRegion) {
    const regionObj = regions.find(r => String(r.id) === selectedRegion);
    if (regionObj && row.regionName !== regionObj.name) return false;
  }

  if (selectedDistrict) {
    const districtObj = districts.find(d => String(d.id) === selectedDistrict);
    if (districtObj && row.districtName !== districtObj.name) return false;
  }

  if (selectedGroup) {
    const groupObj = groups.find(g => String(g.id) === selectedGroup);
    if (groupObj && row.groupName !== groupObj.name) return false;
  }

  return true;
}

function matchesSummaryFilters(row: SummaryRowData, options: SummaryFilterOptions): boolean {
  if (!matchesSummarySearchTerm(row, options.searchTerm.trim())) {
    return false;
  }
  if (!matchesRecognitionFilter(row, options.selectedRecognition)) {
    return false;
  }
  if (!matchesHierarchyFilters(row, options)) {
    return false;
  }
  if (options.selectedUnit && row.unit !== options.selectedUnit) {
    return false;
  }
  if (options.selectedMemberType !== 'all' && row.memberType !== options.selectedMemberType) {
    return false;
  }
  if (options.selectedStatus !== 'all' && row.status !== options.selectedStatus) {
    return false;
  }
  if (options.selectedDatePeriod !== 'all') {
    if (!matchesDateRange(row.rawDate, options.selectedDatePeriod, options.customStartDate, options.customEndDate)) {
      return false;
    }
  }
  return true;
}

function getFilteredSummaryRows(rows: SummaryRowData[], options: SummaryFilterOptions): SummaryRowData[] {
  return rows.filter(row => matchesSummaryFilters(row, options));
}

function renderSummaryTableRows(
  loading: boolean,
  rows: Row<SummaryRowData>[],
  columnsCount: number
) {
  if (loading) {
    return (
      <tr>
        <td colSpan={columnsCount} className="px-6 py-12 text-center text-neutral/50 font-medium">
          Cargando listado general de reconocimientos...
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
            <p className="font-semibold text-neutral">No se encontraron registros de reconocimientos.</p>
            <p className="text-xs text-neutral/50">Ajuste el término de búsqueda o modifique los filtros activos.</p>
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
          <td key={cell.id} className="px-6 py-4 text-sm text-neutral whitespace-nowrap">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    );
  });
}

function getMemberStatusLabel(status: 'active' | 'pending' | 'exceptional'): 'Registro Válido' | 'Registro Inválido' | 'Emisión Excepcional' {
  if (status === 'active') return 'Registro Válido';
  if (status === 'exceptional') return 'Emisión Excepcional';
  return 'Registro Inválido';
}

function getMemberTypeLabel(memberType: 'young' | 'adult'): 'Joven' | 'Adulto' {
  return memberType === 'young' ? 'Joven' : 'Adulto';
}

function resolveHierarchyName(id?: number, rawName?: string): string {
  if (!id || id === 0) return '-';
  const name = rawName ?? '-';
  if (name.toLowerCase() === 'no aplica') return '-';
  return name;
}

function renderStatusBadge(status: 'active' | 'pending' | 'exceptional') {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e6f7eb] text-[#1b7a37] border border-[#c3eed0]">
        ● Registro Válido
      </span>
    );
  }
  if (status === 'exceptional') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f3e8ff] text-[#7e22ce] border border-[#e9d5ff]">
        ● Emisión Excepcional
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#feeae8] text-[#c92a2a] border border-[#fccfca]">
      ● Registro Inválido
    </span>
  );
}

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
  return (
    <span className="text-neutral/80">{info.getValue() as string}</span>
  );
}

function renderStatusCell({ row }: { row: Row<SummaryRowData> }) {
  return renderStatusBadge(row.original.status);
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
  {
    accessorKey: 'issueDate',
    header: 'FECHA',
    cell: renderIssueDateCell
  },
  {
    accessorKey: 'batchCode',
    header: 'LOTE',
    cell: renderBatchCodeCell
  },
  {
    accessorKey: 'recognitionName',
    header: 'RECONOCIMIENTO',
    cell: renderRecognitionCell
  },
  {
    accessorKey: 'identity',
    header: 'CÉDULA',
    cell: renderIdentityCell
  },
  {
    accessorKey: 'firstName',
    header: 'NOMBRE',
    cell: renderFirstNameCell
  },
  {
    accessorKey: 'lastName',
    header: 'APELLIDO',
    cell: renderLastNameCell
  },
  {
    accessorKey: 'unitLabel',
    header: 'UNIDAD',
    cell: renderUnitCell
  },
  {
    accessorKey: 'memberTypeLabel',
    header: 'TIPO',
    cell: renderMemberTypeCell
  },
  {
    accessorKey: 'status',
    header: 'ESTATUS',
    cell: renderStatusCell
  },
  {
    accessorKey: 'recognitionCode',
    header: 'CÓDIGO REC.',
    cell: renderRecognitionCodeCell
  },
  {
    accessorKey: 'regionName',
    header: 'REGIÓN',
    cell: renderRegionCell
  },
  {
    accessorKey: 'districtName',
    header: 'DISTRITO',
    cell: renderDistrictCell
  },
  {
    accessorKey: 'groupName',
    header: 'GRUPO',
    cell: renderGroupCell
  }
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

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecognition, setSelectedRecognition] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedMemberType, setSelectedMemberType] = useState<'all' | 'young' | 'adult'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'pending' | 'exceptional'>('all');
  const [selectedDatePeriod, setSelectedDatePeriod] = useState<
    'all' | 'this-year' | 'this-month' | 'last-30' | 'last-90' | 'custom'
  >('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Pagination state
  const [pageSize, setPageSize] = useState(25);

  // Toast feedback state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
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

  // Master Flat Data Aggregation
  const flatData = useMemo<SummaryRowData[]>(() => {
    return members.map(m => {
      const batch = batches.find(b => b.id === m.batch_id);
      const regionObj = regions.find(r => r.id === batch?.region_id);
      const districtObj = districts.find(d => d.id === batch?.district_id);
      const groupObj = groups.find(g => g.id === batch?.group_id);

      const recType = batch?.recognition_type;
      const recName = resolveRecognitionName(recType);

      const issueDate = batch?.created_at ? formatBatchDate(batch.created_at) : '-';
      const batchCode = batch ? formatBatchCode(batch.id, batch.created_at) : '#000';
      const unitLabel = getUnitLabel(m.unit);
      const memberTypeLabel = getMemberTypeLabel(m.member_type);
      const statusLabel = getMemberStatusLabel(m.status);

      const regionName = resolveHierarchyName(batch?.region_id, regionObj?.name);
      const districtName = resolveHierarchyName(batch?.district_id, districtObj?.name);
      const groupName = resolveHierarchyName(batch?.group_id, groupObj?.name);

      const rawFullName = `${m.first_names ?? ''} ${m.last_names ?? ''}`.trim();
      const fullName = rawFullName.length > 0 ? rawFullName : '-';

      return {
        id: `${m.identity}-${batch?.id ?? '0'}`,
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
        regionName,
        districtName,
        groupName
      };
    });
  }, [batches, members, regions, districts, groups, resolveRecognitionName]);

  // Filter options dependent on hierarchy
  const availableDistricts = useMemo(() => {
    if (!selectedRegion) return districts;
    return districts.filter(d => String(d.region_id) === selectedRegion);
  }, [districts, selectedRegion]);

  const availableGroups = useMemo(() => {
    if (selectedDistrict) {
      return groups.filter(g => String(g.district_id) === selectedDistrict);
    }
    if (selectedRegion) {
      const regionDistrictIds = new Set(districts.filter(d => String(d.region_id) === selectedRegion).map(d => d.id));
      return groups.filter(g => regionDistrictIds.has(g.district_id));
    }
    return groups;
  }, [groups, districts, selectedRegion, selectedDistrict]);

  // Apply All Filters
  const filteredData = useMemo(() => {
    return getFilteredSummaryRows(flatData, {
      searchTerm,
      selectedRecognition,
      selectedRegion,
      selectedDistrict,
      selectedGroup,
      selectedUnit,
      selectedMemberType,
      selectedStatus,
      selectedDatePeriod,
      customStartDate,
      customEndDate,
      regions,
      districts,
      groups
    });
  }, [
    flatData,
    searchTerm,
    selectedRecognition,
    selectedRegion,
    selectedDistrict,
    selectedGroup,
    selectedUnit,
    selectedMemberType,
    selectedStatus,
    selectedDatePeriod,
    customStartDate,
    customEndDate,
    regions,
    districts,
    groups
  ]);

  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm !== '' ||
      selectedRecognition !== '' ||
      selectedRegion !== '' ||
      selectedDistrict !== '' ||
      selectedGroup !== '' ||
      selectedUnit !== '' ||
      selectedMemberType !== 'all' ||
      selectedStatus !== 'all' ||
      selectedDatePeriod !== 'all' ||
      customStartDate !== '' ||
      customEndDate !== ''
    );
  }, [
    searchTerm,
    selectedRecognition,
    selectedRegion,
    selectedDistrict,
    selectedGroup,
    selectedUnit,
    selectedMemberType,
    selectedStatus,
    selectedDatePeriod,
    customStartDate,
    customEndDate
  ]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedRecognition('');
    setSelectedRegion('');
    setSelectedDistrict('');
    setSelectedGroup('');
    setSelectedUnit('');
    setSelectedMemberType('all');
    setSelectedStatus('all');
    setSelectedDatePeriod('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleExportAll = () => {
    exportToExcel(flatData);
    setToastMessage(`¡Todos los registros (${flatData.length}) han sido exportados exitosamente!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const handleExport = () => {
    exportToExcel(filteredData);
    setToastMessage(`¡Registros exportados exitosamente (${filteredData.length})!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const columns = SUMMARY_COLUMNS;

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize
      }
    }
  });

  // Sync pageSize changes to TanStack table
  useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  const currentPageRows = table.getRowModel().rows;
  const totalCount = filteredData.length;
  const totalPages = table.getPageCount();
  const currentPageIndex = table.getState().pagination.pageIndex;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans py-2 relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-neutral text-white px-5 py-3 rounded-2xl shadow-xl animate-fade-in border border-primary/20">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header with Title and Download Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight">
            Resumen General de Reconocimientos
          </h1>
          <p className="text-xs sm:text-sm text-neutral/70 mt-1">
            Consulta y exportación consolidada de todos los reconocimientos emitidos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportAll}
            disabled={flatData.length === 0}
            className="shadow-2xs whitespace-nowrap"
            aria-label="Descargar todo"
          >
            <Download className="w-4 h-4" />
            <span>Descargar todo</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleExport}
            disabled={filteredData.length === 0}
            className="shadow-sm whitespace-nowrap"
            aria-label="Descargar Excel"
          >
            <Download className="w-4 h-4" />
            <span>{hasActiveFilters ? 'Descargar filtrados' : 'Descargar Excel'}</span>

          </Button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Global Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, cédula, lote, reconocimiento, código, región, distrito, grupo..."
            className="w-full pl-10 pr-10 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm text-neutral placeholder:text-neutral/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            aria-label="Búsqueda global"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-1 absolute right-3 top-1/2 -translate-y-1/2 text-neutral/40 hover:text-neutral transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Select Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {/* Recognition Filter */}
          <div>
            <label htmlFor="summary-filter-rec" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
              Reconocimiento
            </label>
            <select
              id="summary-filter-rec"
              aria-label="Filtrar por reconocimiento"
              value={selectedRecognition}
              onChange={e => setSelectedRecognition(e.target.value)}
              className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
            >
              <option value="">Todos los reconocimientos</option>
              {recognitionTypes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <label htmlFor="summary-filter-region" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
              Región
            </label>
            <select
              id="summary-filter-region"
              aria-label="Filtrar por región"
              value={selectedRegion}
              onChange={e => {
                setSelectedRegion(e.target.value);
                setSelectedDistrict('');
                setSelectedGroup('');
              }}
              className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
            >
              <option value="">Todas las regiones</option>
              {regions.map(r => (
                <option key={r.id} value={String(r.id)}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div>
            <label htmlFor="summary-filter-district" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
              Distrito
            </label>
            <select
              id="summary-filter-district"
              aria-label="Filtrar por distrito"
              value={selectedDistrict}
              onChange={e => {
                setSelectedDistrict(e.target.value);
                setSelectedGroup('');
              }}
              className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
            >
              <option value="">Todos los distritos</option>
              {availableDistricts.map(d => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Group Filter */}
          <div>
            <label htmlFor="summary-filter-group" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
              Grupo Scout
            </label>
            <select
              id="summary-filter-group"
              aria-label="Filtrar por grupo"
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
            >
              <option value="">Todos los grupos</option>
              {availableGroups.map(g => (
                <option key={g.id} value={String(g.id)}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Unit Filter */}
          <div>
            <label htmlFor="summary-filter-unit" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
              Unidad Scout
            </label>
            <select
              id="summary-filter-unit"
              aria-label="Filtrar por unidad"
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
            >
              <option value="">Todas las unidades</option>
              <option value="manada">Manada</option>
              <option value="tropa">Tropa</option>
              <option value="caminantes">Caminantes</option>
              <option value="clan">Clan</option>
              <option value="institucional">Institucional</option>
              <option value="no_scout">No scout</option>
            </select>
          </div>

          {/* Member Type Filter */}
          <div>
            <label htmlFor="summary-filter-member-type" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
              Tipo de Miembro
            </label>
            <select
              id="summary-filter-member-type"
              aria-label="Filtrar por tipo de miembro"
              value={selectedMemberType}
              onChange={e => setSelectedMemberType(e.target.value as 'all' | 'young' | 'adult')}
              className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
            >
              <option value="all">Todos los tipos</option>
              <option value="young">Jóvenes</option>
              <option value="adult">Adultos</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="summary-filter-status" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
              Estatus
            </label>
            <select
              id="summary-filter-status"
              aria-label="Filtrar por estatus"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as 'all' | 'active' | 'pending' | 'exceptional')}
              className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
            >
              <option value="all">Todos los estatus</option>
              <option value="active">Registro Válido</option>
              <option value="exceptional">Emisión Excepcional</option>
              <option value="pending">Registro Inválido</option>
            </select>
          </div>

          {/* Date Range Period Filter */}
          <div>
            <label htmlFor="summary-filter-period" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
              Fecha / Período
            </label>
            <select
              id="summary-filter-period"
              aria-label="Filtrar por período"
              value={selectedDatePeriod}
              onChange={e => setSelectedDatePeriod(e.target.value as 'all' | 'this-year' | 'this-month' | 'last-30' | 'last-90' | 'custom')}
              className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
            >
              <option value="all">Todo el histórico</option>
              <option value="this-year">Este Año</option>
              <option value="this-month">Este Mes</option>
              <option value="last-30">Últimos 30 días</option>
              <option value="last-90">Últimos 90 días</option>
              <option value="custom">Rango Personalizado</option>
            </select>
          </div>

          {/* Reset Filters button */}
          <div className="flex items-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full px-3 py-2 flex items-center justify-center gap-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 transition-colors font-semibold text-xs"
                aria-label="Limpiar todos los filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Inputs (if selectedDatePeriod === 'custom') */}
        {selectedDatePeriod === 'custom' && (
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label htmlFor="summary-custom-start" className="font-semibold text-neutral/70">
                Desde:
              </label>
              <input
                id="summary-custom-start"
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Fecha inicio personalizado"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="summary-custom-end" className="font-semibold text-neutral/70">
                Hasta:
              </label>
              <input
                id="summary-custom-end"
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Fecha fin personalizado"
              />
            </div>
          </div>
        )}
      </div>

      {/* TanStack Table Container */}
      <div className="w-full border border-primary/20 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-primary/10 border-b border-primary/20">
                {table.getHeaderGroups().map(headerGroup => (
                  headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider whitespace-nowrap"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {renderSummaryTableRows(loading, currentPageRows, columns.length)}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary Counter and Pagination Controls */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-semibold text-neutral/60">
          <div className="flex items-center gap-3">
            <span>
              Mostrando {currentPageRows.length} de {totalCount} registros totales
            </span>
            <div className="flex items-center gap-1.5">
              <label htmlFor="summary-page-size-select" className="text-neutral/50">
                Filas por pág:
              </label>
              <select
                id="summary-page-size-select"
                aria-label="Selector de filas por página"
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="px-2 py-1 border border-gray-200 rounded-md bg-[#faf8f5] text-neutral text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
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

            <span className="px-2 text-neutral/70 font-medium">
              Página {totalPages === 0 ? 0 : currentPageIndex + 1} de {totalPages}
            </span>

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
    </div>
  );
};

export default SummaryView;
