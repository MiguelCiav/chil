import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { Button } from '../../../../components/Button';
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
      value: displayValue
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
          <div>
            <label htmlFor="filter-type-select" className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral">
              Tipo de Filtro
            </label>
            <select
              id="filter-type-select"
              value={filterType}
              onChange={e => {
                setFilterType(e.target.value as FilterType);
                setFilterValue('');
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
            {filterType === 'region' && (
              <select
                id="filter-value-select"
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                required
              >
                <option value="">Seleccione una región</option>
                {regions.map(r => (
                  <option key={r.id} value={String(r.id)}>{r.name}</option>
                ))}
              </select>
            )}

            {filterType === 'district' && (
              <select
                id="filter-value-select"
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                required
              >
                <option value="">Seleccione un distrito</option>
                {districts.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.name}</option>
                ))}
              </select>
            )}

            {filterType === 'group' && (
              <select
                id="filter-value-select"
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                required
              >
                <option value="">Seleccione un grupo scout</option>
                {groups.map(g => (
                  <option key={g.id} value={String(g.id)}>{g.name}</option>
                ))}
              </select>
            )}

            {filterType === 'recognition' && (
              <select
                id="filter-value-select"
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                required
              >
                <option value="">Seleccione un reconocimiento</option>
                {(recognitionTypes.length > 0 ? recognitionTypes : RECOGNITION_TYPES).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}

            {filterType === 'date' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="date-mode-select" className="block text-xs font-semibold mb-1 text-neutral/70">
                    Modalidad
                  </label>
                  <select
                    id="date-mode-select"
                    value={dateFilterMode}
                    onChange={e => setDateFilterMode(e.target.value as DateFilterMode)}
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
