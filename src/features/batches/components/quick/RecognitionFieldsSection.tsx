import React from 'react';
import { Award } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../../components/Card';
import { Region, District, ScoutGroup, ScoutUnit } from '../../types';
import { RecognitionType } from '../../../recognitions';

export interface RecognitionFieldsSectionProps {
  recognitionType: string;
  onRecognitionTypeChange: (val: string) => void;
  availableRecognitionTypes: (RecognitionType | { id: string; name: string })[];
  regionId: string;
  onRegionChange: (val: string) => void;
  regions: Region[];
  districtId: string;
  onDistrictChange: (val: string) => void;
  filteredDistricts: District[];
  groupId: string;
  onGroupChange: (val: string) => void;
  filteredGroups: ScoutGroup[];
  comment: string;
  onCommentChange: (val: string) => void;
  unit: ScoutUnit;
  loadingHierarchy: boolean;
  errors: Record<string, string>;
}

function getSelectFieldClass(isDisabled: boolean, hasError: boolean): string {
  if (isDisabled) {
    return 'bg-gray-100 opacity-50 cursor-not-allowed border-gray-200';
  }
  if (hasError) {
    return 'border-red-300 ring-2 ring-red-500 bg-red-50';
  }
  return 'border-primary/20';
}

function getSelectPlaceholder(isNoScout: boolean, defaultLabel: string): string {
  return isNoScout ? 'No aplica' : defaultLabel;
}

export const RecognitionFieldsSection: React.FC<RecognitionFieldsSectionProps> = ({
  recognitionType,
  onRecognitionTypeChange,
  availableRecognitionTypes,
  regionId,
  onRegionChange,
  regions,
  districtId,
  onDistrictChange,
  filteredDistricts,
  groupId,
  onGroupChange,
  filteredGroups,
  comment,
  onCommentChange,
  unit,
  loadingHierarchy,
  errors
}) => {
  const isNoScout = unit === 'no_scout';
  const isDistrictDisabled = !regionId || regionId === '0' || loadingHierarchy;
  const isGroupDisabled = !districtId || districtId === '0' || regionId === '0' || loadingHierarchy;

  const districtValue = regionId === '0' ? '0' : districtId;
  const groupValue = (regionId === '0' || districtId === '0') ? '0' : groupId;

  const districtClass = getSelectFieldClass(isDistrictDisabled, Boolean(errors.districtId));
  const groupClass = getSelectFieldClass(isGroupDisabled, Boolean(errors.groupId));

  return (
    <div data-walkthrough="quick-rec-recognition-section">
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-[#faf8f5] border-b border-gray-200 text-neutral font-bold flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          1. Datos del Reconocimiento
        </CardHeader>
      <CardBody className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tipo de Reconocimiento */}
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="quick-rec-type" className="block uppercase text-xs font-bold tracking-wide text-neutral">
              Tipo de Reconocimiento *
            </label>
            <select
              id="quick-rec-type"
              aria-label="Tipo de Reconocimiento"
              value={recognitionType}
              onChange={(e) => onRecognitionTypeChange(e.target.value)}
              className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${
                errors.recognitionType ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
              }`}
              disabled={loadingHierarchy}
            >
              <option value="">Seleccione un tipo de reconocimiento</option>
              {availableRecognitionTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {errors.recognitionType && (
              <p className="text-xs text-red-600 font-medium mt-1">{errors.recognitionType}</p>
            )}
          </div>

          {/* Region */}
          <div className="space-y-1">
            <label htmlFor="quick-region" className="block uppercase text-xs font-bold tracking-wide text-neutral">
              Región Scout {isNoScout ? '(Opcional)' : '*'}
            </label>
            <select
              id="quick-region"
              aria-label="Región Scout"
              value={regionId}
              onChange={(e) => onRegionChange(e.target.value)}
              className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${
                errors.regionId ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
              }`}
              disabled={loadingHierarchy}
            >
              <option value="">{getSelectPlaceholder(isNoScout, 'Seleccione una región')}</option>
              <option value="0">No aplica</option>
              {regions.filter((r) => r.id !== 0).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {errors.regionId && (
              <p className="text-xs text-red-600 font-medium mt-1">{errors.regionId}</p>
            )}
          </div>

          {/* District */}
          <div className="space-y-1">
            <label htmlFor="quick-district" className="block uppercase text-xs font-bold tracking-wide text-neutral">
              Distrito Scout {isNoScout ? '(Opcional)' : '*'}
            </label>
            <select
              id="quick-district"
              aria-label="Distrito Scout"
              value={districtValue}
              onChange={(e) => onDistrictChange(e.target.value)}
              disabled={isDistrictDisabled}
              className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${districtClass}`}
            >
              <option value="">{getSelectPlaceholder(isNoScout, 'Seleccione un distrito')}</option>
              <option value="0">No aplica</option>
              {filteredDistricts.filter((d) => d.id !== 0).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {errors.districtId && (
              <p className="text-xs text-red-600 font-medium mt-1">{errors.districtId}</p>
            )}
          </div>

          {/* Group */}
          <div className="space-y-1">
            <label htmlFor="quick-group" className="block uppercase text-xs font-bold tracking-wide text-neutral">
              Grupo Scout {isNoScout ? '(Opcional)' : '*'}
            </label>
            <select
              id="quick-group"
              aria-label="Grupo Scout"
              value={groupValue}
              onChange={(e) => onGroupChange(e.target.value)}
              disabled={isGroupDisabled}
              className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${groupClass}`}
            >
              <option value="">{getSelectPlaceholder(isNoScout, 'Seleccione un grupo scout')}</option>
              <option value="0">No aplica</option>
              {filteredGroups.filter((g) => g.id !== 0).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {errors.groupId && (
              <p className="text-xs text-red-600 font-medium mt-1">{errors.groupId}</p>
            )}
          </div>

          {/* Comentario / Motivo (Opcional) */}
          <div className="space-y-1">
            <label htmlFor="quick-comment" className="block uppercase text-xs font-bold tracking-wide text-neutral">
              Comentario / Motivo (Opcional)
            </label>
            <input
              id="quick-comment"
              aria-label="Comentario / Motivo (Opcional)"
              type="text"
              placeholder="Ej. Reconocimiento individual por labor destacada"
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              className="w-full rounded-field px-4 transition-all bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px]"
            />
          </div>
        </div>
      </CardBody>
    </Card>
  </div>
  );
};
