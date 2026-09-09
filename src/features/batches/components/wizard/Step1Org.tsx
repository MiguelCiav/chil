import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Region, District, ScoutGroup } from '../../types';
import { Field } from '../../../../components/Field';
import { SearchSelectorModal } from '../../../../components/SearchSelectorModal';

export interface Step1FormData {
  comment?: string;
  regionId?: string;
  districtId?: string;
  groupId?: string;
  recognitionType: string;
  unitScope?: string;
}

interface Step1OrgProps {
  register: UseFormRegister<Step1FormData>;
  setValue: UseFormSetValue<Step1FormData>;
  watch: UseFormWatch<Step1FormData>;
  errors: FieldErrors<Step1FormData>;
  regions: Region[];
  districts: District[];
  groups: ScoutGroup[];
  loadingHierarchy: boolean;
  recognitionTypes?: { id: string; name: string }[];
}

function getAvailableRegions(regions: Region[], isNoScout?: boolean): Region[] {
  const zeroName = isNoScout ? 'No aplica' : 'Mixto';
  const list = regions.filter(r => r.id !== 0);
  return [{ id: 0, name: zeroName }, ...list];
}

function getFilteredDistricts(
  districts: District[],
  selectedRegionId?: string,
  isNoScout?: boolean
): District[] {
  if (!selectedRegionId) return [];
  const zeroName = isNoScout ? 'No aplica' : 'Mixto';
  const dists = selectedRegionId === '0'
    ? districts.filter(d => d.id !== 0)
    : districts.filter(d => d.id !== 0 && d.region_id === Number(selectedRegionId));
  return [{ id: 0, name: zeroName, region_id: Number(selectedRegionId || 0) }, ...dists];
}

function getFilteredGroups(
  groups: ScoutGroup[],
  selectedDistrictId?: string,
  isNoScout?: boolean
): ScoutGroup[] {
  if (!selectedDistrictId) return [];
  const zeroName = isNoScout ? 'No aplica' : 'Mixto';
  const grps = selectedDistrictId === '0'
    ? groups.filter(g => g.id !== 0)
    : groups.filter(g => g.id !== 0 && g.district_id === Number(selectedDistrictId));
  return [
    { id: 0, name: zeroName, district_id: Number(selectedDistrictId || 0) },
    ...grps
  ];
}

function getSelectedRegion(regions: Region[], selectedRegionId?: string, isNoScout?: boolean): { id: number; name: string } | undefined {
  if (selectedRegionId === '0') return { id: 0, name: isNoScout ? 'No aplica' : 'Mixto' };
  return regions.find(r => r.id.toString() === selectedRegionId);
}

function getSelectedDistrict(districts: District[], selectedDistrictId?: string, isNoScout?: boolean): { id: number; name: string; region_id: number } | undefined {
  if (selectedDistrictId === '0') return { id: 0, name: isNoScout ? 'No aplica' : 'Mixto', region_id: 0 };
  return districts.find(d => d.id.toString() === selectedDistrictId);
}

function getSelectedGroup(
  groups: ScoutGroup[],
  selectedGroupId?: string,
  selectedDistrictId?: string,
  isNoScout?: boolean
): { id: number; name: string; district_id: number } | undefined {
  if (selectedGroupId === '0') {
    return {
      id: 0,
      name: isNoScout ? 'No aplica' : 'Mixto',
      district_id: Number(selectedDistrictId || 0)
    };
  }
  return groups.find(g => g.id.toString() === selectedGroupId);
}

function getRegionDisplayText(selectedRegion?: { name: string }, isNoScout?: boolean): string {
  if (selectedRegion) return selectedRegion.name;
  if (isNoScout) return 'No aplica';
  return 'Seleccione una región';
}

function getDistrictDisplayText(
  selectedDistrict?: { name: string },
  selectedRegionId?: string,
  isNoScout?: boolean
): string {
  if (selectedDistrict) return selectedDistrict.name;
  if (isNoScout && !selectedRegionId) return 'No aplica';
  return 'Seleccione un distrito';
}

function getGroupDisplayText(
  selectedGroup?: { name: string },
  isNoScout?: boolean
): string {
  if (selectedGroup) return selectedGroup.name;
  if (isNoScout) return 'No aplica';
  return 'Seleccione un grupo scout';
}

function getSelectorButtonClass(isDisabled: boolean, hasError: boolean): string {
  if (isDisabled) {
    return 'bg-gray-100 text-neutral/40 border-gray-200 cursor-not-allowed opacity-60';
  }
  if (hasError) {
    return 'border-red-300 ring-2 ring-red-500 bg-red-50 text-red-900';
  }
  return 'border-primary/20 text-neutral hover:border-primary/50';
}

export const Step1Org: React.FC<Step1OrgProps> = ({
  register,
  setValue,
  watch,
  errors,
  regions,
  districts,
  groups,
  loadingHierarchy,
  recognitionTypes = []
}) => {
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isDistrictModalOpen, setIsDistrictModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const selectedRegionId = watch('regionId');
  const selectedDistrictId = watch('districtId');
  const selectedGroupId = watch('groupId');
  const selectedUnitScope = watch('unitScope');
  const isNoScout = selectedUnitScope === 'no_scout';

  const availableRegions = React.useMemo(
    () => getAvailableRegions(regions, isNoScout),
    [regions, isNoScout]
  );

  const filteredDistricts = React.useMemo(
    () => getFilteredDistricts(districts, selectedRegionId, isNoScout),
    [districts, selectedRegionId, isNoScout]
  );

  const filteredGroups = React.useMemo(
    () => getFilteredGroups(groups, selectedDistrictId, isNoScout),
    [groups, selectedDistrictId, isNoScout]
  );

  const selectedRegion = getSelectedRegion(regions, selectedRegionId, isNoScout);
  const selectedDistrict = getSelectedDistrict(districts, selectedDistrictId, isNoScout);
  const selectedGroup = getSelectedGroup(groups, selectedGroupId, selectedDistrictId, isNoScout);

  const isDistrictDisabled = !selectedRegionId || loadingHierarchy;
  const isGroupDisabled = !selectedDistrictId || loadingHierarchy;

  const districtBtnClass = getSelectorButtonClass(isDistrictDisabled, Boolean(errors.districtId));
  const groupBtnClass = getSelectorButtonClass(isGroupDisabled, Boolean(errors.groupId));
  const regionBtnClass = getSelectorButtonClass(loadingHierarchy, Boolean(errors.regionId));

  return (
    <div className="space-y-6">
      {/* Empty Recognition Types Alert Card */}
      {!loadingHierarchy && recognitionTypes.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-amber-900">
              No tienes tipos de reconocimientos registrados. Debes crear al menos un tipo de reconocimiento en el Catálogo antes de crear un nuevo lote.
            </p>
          </div>
          <Link
            to="/reconocimientos"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors flex-shrink-0 shadow-xs"
          >
            Ir al Catálogo de Reconocimientos
          </Link>
        </div>
      )}

      {/* Hidden inputs for RHF validation */}
      <input type="hidden" {...register('regionId')} />
      <input type="hidden" {...register('districtId')} />
      <input type="hidden" {...register('groupId')} />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Region Selector */}
          <div className="w-full">
            <label htmlFor="region-selector" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
              Región Scout {isNoScout ? '(Opcional)' : '*'}
            </label>
            <button
              type="button"
              id="region-selector"
              onClick={() => setIsRegionModalOpen(true)}
              className={`w-full rounded-field px-4 text-left transition-all bg-primary/5 border text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary h-[46px] ${regionBtnClass}`}
              disabled={loadingHierarchy}
            >
              <span className="truncate">{getRegionDisplayText(selectedRegion, isNoScout)}</span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${loadingHierarchy ? 'text-neutral/20' : 'text-primary/70'}`} />
            </button>
            {errors.regionId && (
              <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.regionId.message as string}</p>
            )}
          </div>

          {/* District Selector */}
          <div className="w-full">
            <label htmlFor="district-selector" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
              Distrito Scout {isNoScout ? '(Opcional)' : '*'}
            </label>
            <button
              type="button"
              id="district-selector"
              onClick={() => {
                if (!isDistrictDisabled) {
                  setIsDistrictModalOpen(true);
                }
              }}
              className={`w-full rounded-field px-4 text-left transition-all bg-primary/5 border text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary h-[46px] ${districtBtnClass}`}
              disabled={isDistrictDisabled}
            >
              <span className="truncate">
                {getDistrictDisplayText(selectedDistrict, selectedRegionId, isNoScout)}
              </span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isDistrictDisabled ? 'text-neutral/20' : 'text-primary/70'}`} />
            </button>
            {errors.districtId && (
              <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.districtId.message as string}</p>
            )}
          </div>

          {/* Group Selector */}
          <div className="w-full">
            <label htmlFor="group-selector" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
              Grupo Scout {isNoScout ? '(Opcional)' : '*'}
            </label>
            <button
              type="button"
              id="group-selector"
              onClick={() => {
                if (!isGroupDisabled) {
                  setIsGroupModalOpen(true);
                }
              }}
              className={`w-full rounded-field px-4 text-left transition-all bg-primary/5 border text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary h-[46px] ${groupBtnClass}`}
              disabled={isGroupDisabled}
            >
              <span className="truncate">
                {getGroupDisplayText(selectedGroup, isNoScout)}
              </span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isGroupDisabled ? 'text-neutral/20' : 'text-primary/70'}`} />
            </button>
            {errors.groupId && (
              <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.groupId.message as string}</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Unit Scope Selector */}
          <div className="w-full">
            <label htmlFor="unit-scope-select" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
              Alcance de Unidad *
            </label>
            <select
              id="unit-scope-select"
              className="w-full rounded-field px-4 transition-all bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px]"
              disabled={loadingHierarchy}
              {...register('unitScope')}
            >
              <option value="mixed">Mixto (Todas las unidades)</option>
              <option value="manada">Manada</option>
              <option value="tropa">Tropa</option>
              <option value="caminantes">Caminantes</option>
              <option value="clan">Clan</option>
              <option value="institucional">Institucional</option>
              <option value="no_scout">No scout</option>
            </select>
          </div>

          {/* Recognition Type Select */}
          <div className="w-full">
            <label htmlFor="recognition-select" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
              Tipo de Reconocimiento *
            </label>
            <select
              id="recognition-select"
              className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:text-neutral/30 disabled:border-gray-200 disabled:cursor-not-allowed text-sm h-[46px] ${
                errors.recognitionType ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
              }`}
              disabled={loadingHierarchy || recognitionTypes.length === 0}
              {...register('recognitionType')}
            >
              <option value="">Seleccione un reconocimiento</option>
              {recognitionTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {errors.recognitionType && (
              <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.recognitionType.message as string}</p>
            )}
          </div>

          <Field
            label="Comentario (Opcional)"
            placeholder="Ej. Lote Aniversario Mayo 2026"
            disabled={loadingHierarchy}
            {...register('comment')}
          />
        </div>
      </div>

      {/* Region Selector Modal */}
      <SearchSelectorModal<Region>
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
        title="Seleccionar Región Scout"
        placeholder="Buscar región..."
        items={availableRegions}
        selectedId={selectedRegionId || null}
        onSelect={(r) => {
          setValue('regionId', r.id.toString(), { shouldValidate: true });
          setValue('districtId', '', { shouldValidate: true });
          setValue('groupId', '', { shouldValidate: true });
        }}
        searchFilter={(r, q) => r.name.toLowerCase().includes(q.toLowerCase())}
        renderItem={(r) => <span>{r.name}</span>}
        keyExtractor={(r) => r.id}
      />

      {/* District Selector Modal */}
      <SearchSelectorModal<District>
        isOpen={isDistrictModalOpen}
        onClose={() => setIsDistrictModalOpen(false)}
        title="Seleccionar Distrito Scout"
        placeholder="Buscar distrito..."
        items={filteredDistricts}
        selectedId={selectedDistrictId || null}
        onSelect={(d) => {
          setValue('districtId', d.id.toString(), { shouldValidate: true });
          setValue('groupId', '', { shouldValidate: true });
        }}
        searchFilter={(d, q) => d.name.toLowerCase().includes(q.toLowerCase())}
        renderItem={(d) => <span>{d.name}</span>}
        keyExtractor={(d) => d.id}
      />

      {/* Group Selector Modal */}
      <SearchSelectorModal<ScoutGroup>
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title="Seleccionar Grupo Scout"
        placeholder="Buscar grupo..."
        items={filteredGroups}
        selectedId={selectedGroupId || null}
        onSelect={(g) => setValue('groupId', g.id.toString(), { shouldValidate: true })}
        searchFilter={(g, q) => g.name.toLowerCase().includes(q.toLowerCase())}
        renderItem={(g) => <span>{g.name}</span>}
        keyExtractor={(g) => g.id}
      />
    </div>
  );
};
