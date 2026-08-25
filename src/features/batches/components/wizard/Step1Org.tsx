import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
import { Region, District, ScoutGroup } from '../../types';
import { RECOGNITION_TYPES } from '../../api';
import { Field } from '../../../../components/Field';
import { SearchSelectorModal } from '../../../../components/SearchSelectorModal';

export interface Step1FormData {
  comment?: string;
  regionId: string;
  districtId: string;
  groupId: string;
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

  const filteredDistricts = districts.filter(
    d => d.region_id === Number(selectedRegionId)
  );

  const filteredGroups = groups.filter(
    g => g.district_id === Number(selectedDistrictId)
  );

  const selectedRegion = regions.find(r => r.id.toString() === selectedRegionId);
  const selectedDistrict = districts.find(d => d.id.toString() === selectedDistrictId);
  const selectedGroup = groups.find(g => g.id.toString() === selectedGroupId);

  const getDistrictButtonClass = () => {
    if (!selectedRegionId || loadingHierarchy) {
      return 'bg-gray-100 text-neutral/30 border-gray-200 cursor-not-allowed opacity-50';
    }
    if (errors.districtId) {
      return 'border-red-300 ring-2 ring-red-500 bg-red-50 text-red-900';
    }
    return 'border-primary/20 text-neutral hover:border-primary/50';
  };

  const getGroupButtonClass = () => {
    if (!selectedDistrictId || loadingHierarchy) {
      return 'bg-gray-100 text-neutral/30 border-gray-200 cursor-not-allowed opacity-50';
    }
    if (errors.groupId) {
      return 'border-red-300 ring-2 ring-red-500 bg-red-50 text-red-900';
    }
    return 'border-primary/20 text-neutral hover:border-primary/50';
  };

  return (
    <div className="space-y-6">
      {/* Hidden inputs for RHF validation */}
      <input type="hidden" {...register('regionId')} />
      <input type="hidden" {...register('districtId')} />
      <input type="hidden" {...register('groupId')} />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Region Selector */}
          <div className="w-full">
            <label htmlFor="region-selector" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
              Región Scout *
            </label>
            <button
              type="button"
              id="region-selector"
              onClick={() => setIsRegionModalOpen(true)}
              className={`w-full rounded-field px-4 text-left transition-all bg-primary/5 border text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary h-[46px] ${
                errors.regionId
                  ? 'border-red-300 ring-2 ring-red-500 bg-red-50 text-red-900'
                  : 'border-primary/20 text-neutral hover:border-primary/50'
              }`}
              disabled={loadingHierarchy}
            >
              <span className="truncate">{selectedRegion ? selectedRegion.name : 'Seleccione una región'}</span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${loadingHierarchy ? 'text-neutral/20' : 'text-primary/70'}`} />
            </button>
            {errors.regionId && (
              <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.regionId.message as string}</p>
            )}
          </div>

          {/* District Selector */}
          <div className="w-full">
            <label htmlFor="district-selector" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
              Distrito Scout *
            </label>
            <button
              type="button"
              id="district-selector"
              onClick={() => {
                if (selectedRegionId) {
                  setIsDistrictModalOpen(true);
                }
              }}
              className={`w-full rounded-field px-4 text-left transition-all bg-primary/5 border text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary h-[46px] ${getDistrictButtonClass()}`}
              disabled={!selectedRegionId || loadingHierarchy}
            >
              <span className="truncate">{selectedDistrict ? selectedDistrict.name : 'Seleccione un distrito'}</span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${!selectedRegionId || loadingHierarchy ? 'text-neutral/20' : 'text-primary/70'}`} />
            </button>
            {errors.districtId && (
              <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.districtId.message as string}</p>
            )}
          </div>

          {/* Group Selector */}
          <div className="w-full">
            <label htmlFor="group-selector" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
              Grupo Scout *
            </label>
            <button
              type="button"
              id="group-selector"
              onClick={() => {
                if (selectedDistrictId) {
                  setIsGroupModalOpen(true);
                }
              }}
              className={`w-full rounded-field px-4 text-left transition-all bg-primary/5 border text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary h-[46px] ${getGroupButtonClass()}`}
              disabled={!selectedDistrictId || loadingHierarchy}
            >
              <span className="truncate">{selectedGroup ? selectedGroup.name : 'Seleccione un grupo scout'}</span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${!selectedDistrictId || loadingHierarchy ? 'text-neutral/20' : 'text-primary/70'}`} />
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
              <option value="mixed">🌐 Mixto (Permite cualquier unidad)</option>
              <option value="manada">🟡 Manada (Lobatos/Lobeznas)</option>
              <option value="tropa">🟢 Tropa (Scouts)</option>
              <option value="caminantes">🔵 Caminantes</option>
              <option value="clan">🔴 Clan (Rovers)</option>
              <option value="institucional">🟣 Institucional (Adultos / Dirigentes)</option>
              <option value="no_scout">⚪ No Scout (Colaboradores / Externos)</option>
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
              disabled={loadingHierarchy}
              {...register('recognitionType')}
            >
              <option value="">Seleccione un reconocimiento</option>
              {(recognitionTypes && recognitionTypes.length > 0 ? recognitionTypes : RECOGNITION_TYPES).map(t => (
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
        items={regions}
        selectedId={selectedRegionId}
        onSelect={(r) => setValue('regionId', r.id.toString(), { shouldValidate: true })}
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
        selectedId={selectedDistrictId}
        onSelect={(d) => setValue('districtId', d.id.toString(), { shouldValidate: true })}
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
        selectedId={selectedGroupId}
        onSelect={(g) => setValue('groupId', g.id.toString(), { shouldValidate: true })}
        searchFilter={(g, q) => g.name.toLowerCase().includes(q.toLowerCase())}
        renderItem={(g) => <span>{g.name}</span>}
        keyExtractor={(g) => g.id}
      />
    </div>
  );
};
