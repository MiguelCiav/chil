import React, { useMemo } from 'react';
import { Select } from '../../../components';
import {
  buildCommonFilterBadges,
  FilterCard,
  HierarchyFilterSelects
} from '../../../domain/components';
import { StatisticsFilterState } from '../types';
import { Region, District } from '../../../types';
import { RecognitionType } from '../../recognitions';

interface FilterBarProps {
  filters: StatisticsFilterState;
  setFilter: <K extends keyof StatisticsFilterState>(key: K, value: StatisticsFilterState[K]) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  regions: Region[];
  availableDistricts: District[];
  recognitionTypes: RecognitionType[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilter,
  resetFilters,
  hasActiveFilters,
  regions,
  availableDistricts,
  recognitionTypes
}) => {
  const activeFilterBadges = useMemo(() => {
    const badges = buildCommonFilterBadges({
      recognition: {
        id: filters.recognitionId ?? '',
        options: recognitionTypes,
        onRemove: () => setFilter('recognitionId', '')
      },
      region: {
        id: filters.regionId ?? '',
        options: regions,
        onRemove: () => setFilter('regionId', '')
      },
      district: {
        id: filters.districtId ?? '',
        options: availableDistricts,
        onRemove: () => setFilter('districtId', '')
      },
      period: {
        value: filters.period,
        startDate: filters.startDate,
        endDate: filters.endDate,
        onRemove: () => {
          setFilter('period', 'all');
          setFilter('startDate', '');
          setFilter('endDate', '');
        }
      }
    });

    if (filters.memberType && filters.memberType !== 'all') {
      badges.push({
        id: 'memberType',
        label: 'Demografía',
        value: filters.memberType === 'young' ? 'Solo Jóvenes' : 'Solo Adultos',
        onRemove: () => setFilter('memberType', 'all')
      });
    }

    return badges;
  }, [filters, recognitionTypes, regions, availableDistricts, setFilter]);

  return (
    <FilterCard
      searchId="stats-filter-search"
      searchValue={filters.searchTerm ?? ''}
      onSearchChange={val => setFilter('searchTerm', val)}
      searchPlaceholder="Buscar por nombre, cédula, lote, reconocimiento, región, distrito, grupo..."
      searchAriaLabel="Buscar en estadísticas"
      period={filters.period}
      onPeriodChange={val => setFilter('period', val)}
      periodSelectId="stats-filter-period"
      customStartDate={filters.startDate ?? ''}
      customEndDate={filters.endDate ?? ''}
      onCustomStartDateChange={val => setFilter('startDate', val)}
      onCustomEndDateChange={val => setFilter('endDate', val)}
      customStartId="stats-custom-start"
      customEndId="stats-custom-end"
      hasActiveFilters={hasActiveFilters}
      onResetFilters={resetFilters}
      resetAriaLabel="Limpiar filtros activos"
      activeFilters={activeFilterBadges}
    >
      <Select
        id="stats-filter-rec"
        label="Reconocimiento"
        size="sm"
        aria-label="Filtrar por tipo de reconocimiento"
        value={filters.recognitionId ?? ''}
        onChange={e => setFilter('recognitionId', e.target.value)}
      >
        <option value="">Todos los reconocimientos</option>
        {recognitionTypes.map(r => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </Select>

      <HierarchyFilterSelects
        regions={regions}
        districts={availableDistricts}
        regionId={filters.regionId ?? ''}
        districtId={filters.districtId ?? ''}
        showGroup={false}
        includeNoAplicaAlways
        onRegionChange={val => setFilter('regionId', val)}
        onDistrictChange={val => setFilter('districtId', val)}
      />

      <Select
        id="stats-filter-member-type"
        label="Demografía"
        size="sm"
        aria-label="Filtrar por tipo demográfico"
        value={filters.memberType ?? 'all'}
        onChange={e => setFilter('memberType', e.target.value as 'all' | 'young' | 'adult')}
      >
        <option value="all">Todos los scouts</option>
        <option value="young">Solo Jóvenes</option>
        <option value="adult">Solo Adultos</option>
      </Select>
    </FilterCard>
  );
};
