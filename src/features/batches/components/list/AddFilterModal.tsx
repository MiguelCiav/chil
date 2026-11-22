import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { Button } from '../../../../components/Button';
import { Field } from '../../../../components/Field';
import { Select } from '../../../../components/Select';
import { isNoAplicaDistrict } from '../../../../utils/memberHierarchy';
import { Region, District, ScoutGroup, ActiveFilterChip } from '../../types';
import { RecognitionType } from '../../../recognitions';
import { RECOGNITION_TYPES } from '../../api';
import { FilterType, DateFilterMode } from './types';
import {
  formatDateToDisplay,
  getFilterLabelAndValue,
  isApplyFilterDisabled
} from './batchListFilters';

export interface AddFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (chip: ActiveFilterChip) => void;
  regions: Region[];
  districts: District[];
  groups: ScoutGroup[];
  recognitionTypes: RecognitionType[];
}

export const AddFilterModal: React.FC<AddFilterModalProps> = ({
  isOpen,
  onClose,
  onApplyFilter,
  regions,
  districts,
  groups,
  recognitionTypes
}) => {
  const [filterType, setFilterType] = useState<FilterType>('region');
  const [filterValue, setFilterValue] = useState<string>('');
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('predefined');
  const [datePredefinedValue, setDatePredefinedValue] = useState<string>('Este Año');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [dateSpecificValue, setDateSpecificValue] = useState<string>('');

  const handleResetAndClose = () => {
    setFilterValue('');
    setDateFilterMode('predefined');
    setDatePredefinedValue('Este Año');
    setDateRangeStart('');
    setDateRangeEnd('');
    setDateSpecificValue('');
    onClose();
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    let computedFilterValue = filterValue;
    if (filterType === 'date') {
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
      filterType,
      computedFilterValue,
      { regions, districts, groups },
      recognitionTypes
    );

    const newChip: ActiveFilterChip = {
      id: `${filterType}-${Date.now()}`,
      type: filterType,
      label,
      value: displayValue,
      filterValue: computedFilterValue
    };

    onApplyFilter(newChip);
    handleResetAndClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleResetAndClose} className="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
        <ModalHeader onClose={handleResetAndClose}>
          Añadir Filtro al Listado
        </ModalHeader>
        <ModalBody className="space-y-4">
          <Select
            id="filter-type-select"
            label="Tipo de Filtro"
            value={filterType}
            onChange={e => {
              setFilterType(e.target.value as FilterType);
              setFilterValue('');
            }}
          >
            <option value="region">Región Scout</option>
            <option value="district">Distrito Scout</option>
            <option value="group">Grupo Scout</option>
            <option value="completeness">Completitud</option>
            <option value="recognition">Tipo de Reconocimiento</option>
            <option value="date">Fecha / Período</option>
          </Select>

          <div>
            <label htmlFor="filter-value-select" className="block text-sm font-semibold mb-2 text-neutral">
              Valor del Filtro
            </label>
            {filterType === 'region' && (
              <Select
                id="filter-value-select"
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                required
              >
                <option value="">Seleccione una región</option>
                <option value="nacional">Nacional</option>
                <option value="0">No aplica</option>
                {regions
                  .filter(r => r.id !== 0)
                  .map(r => (
                    <option key={r.id} value={`id:${r.id}`}>{r.name}</option>
                  ))}
              </Select>
            )}

            {filterType === 'district' && (
              <Select
                id="filter-value-select"
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                required
              >
                <option value="">Seleccione un distrito</option>
                <option value="0">No aplica</option>
                {districts
                  .filter(d => d.id !== 0 && !isNoAplicaDistrict(d))
                  .map(d => (
                    <option key={d.id} value={`id:${d.id}`}>{d.name}</option>
                  ))}
              </Select>
            )}

            {filterType === 'group' && (
              <Select
                id="filter-value-select"
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                required
              >
                <option value="">Seleccione un grupo scout</option>
                <option value="0">No aplica</option>
                <option value="no_scout">No scout</option>
                {groups
                  .filter(g => g.id !== 0)
                  .map(g => (
                    <option key={g.id} value={`id:${g.id}`}>{g.name}</option>
                  ))}
              </Select>
            )}

            {filterType === 'completeness' && (
              <Select
                id="filter-value-select"
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                required
              >
                <option value="">Seleccione un estado</option>
                <option value="complete">Todos registrados</option>
                <option value="pending">Registros pendientes</option>
                <option value="empty">Sin miembros</option>
              </Select>
            )}

            {filterType === 'recognition' && (
              <Select
                id="filter-value-select"
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                required
              >
                <option value="">Seleccione un reconocimiento</option>
                {(recognitionTypes.length > 0 ? recognitionTypes : RECOGNITION_TYPES).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            )}

            {filterType === 'date' && (
              <div className="space-y-3">
                <Select
                  id="date-mode-select"
                  label="Modalidad"
                  size="sm"
                  value={dateFilterMode}
                  onChange={e => setDateFilterMode(e.target.value as DateFilterMode)}
                >
                  <option value="predefined">Período predefinido</option>
                  <option value="range">Rango de fechas</option>
                  <option value="specific">Fecha específica</option>
                </Select>

                {dateFilterMode === 'predefined' && (
                  <Select
                    id="date-predefined-select"
                    label="Período"
                    size="sm"
                    value={datePredefinedValue}
                    onChange={e => setDatePredefinedValue(e.target.value)}
                    required
                  >
                    <option value="Este Año">Este Año</option>
                    <option value="Últimos 30 días">Últimos 30 días</option>
                    <option value="Últimos 90 días">Últimos 90 días</option>
                    <option value="Este Mes">Este Mes</option>
                    <option value="Todo el histórico">Todo el histórico</option>
                  </Select>
                )}

                {dateFilterMode === 'range' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      id="date-start-input"
                      label="Fecha Inicio"
                      size="sm"
                      type="date"
                      value={dateRangeStart}
                      onChange={e => setDateRangeStart(e.target.value)}
                      required
                    />
                    <Field
                      id="date-end-input"
                      label="Fecha Fin"
                      size="sm"
                      type="date"
                      value={dateRangeEnd}
                      onChange={e => setDateRangeEnd(e.target.value)}
                      required
                    />
                  </div>
                )}

                {dateFilterMode === 'specific' && (
                  <Field
                    id="date-specific-input"
                    label="Fecha"
                    size="sm"
                    type="date"
                    value={dateSpecificValue}
                    onChange={e => setDateSpecificValue(e.target.value)}
                    required
                  />
                )}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleResetAndClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isApplyFilterDisabled(
              filterType,
              dateFilterMode,
              datePredefinedValue,
              dateRangeStart,
              dateRangeEnd,
              dateSpecificValue,
              filterValue
            )}
          >
            Aplicar Filtro
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
