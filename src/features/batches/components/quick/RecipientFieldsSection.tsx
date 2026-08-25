import React from 'react';
import { Users, Search, RotateCcw } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../../components/Card';
import { Button } from '../../../../components/Button';
import { ScoutUnit } from '../../types';

export interface RecipientFieldsSectionProps {
  unit: ScoutUnit;
  onUnitChange: (val: ScoutUnit) => void;
  identity: string;
  onIdentityChange: (val: string) => void;
  isSearchingScraper: boolean;
  onConsult: () => void;
  firstNames: string;
  onFirstNamesChange: (val: string) => void;
  lastNames: string;
  onLastNamesChange: (val: string) => void;
  recognitionCode: string;
  onRecognitionCodeChange: (val: string) => void;
  onRegenerateCode: () => void;
  scraperStatus: 'idle' | 'success' | 'error';
  scraperMsg: string;
  errors: Record<string, string>;
}

export const RecipientFieldsSection: React.FC<RecipientFieldsSectionProps> = ({
  unit,
  onUnitChange,
  identity,
  onIdentityChange,
  isSearchingScraper,
  onConsult,
  firstNames,
  onFirstNamesChange,
  lastNames,
  onLastNamesChange,
  recognitionCode,
  onRecognitionCodeChange,
  onRegenerateCode,
  scraperStatus,
  scraperMsg,
  errors
}) => {
  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="bg-[#faf8f5] border-b border-gray-200 text-neutral font-bold flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        2. Datos del Homenajeado
      </CardHeader>
      <CardBody className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Unidad / Categoría */}
          <div className="space-y-1">
            <label htmlFor="quick-unit" className="block uppercase text-xs font-bold tracking-wide text-neutral">
              Unidad / Categoría *
            </label>
            <select
              id="quick-unit"
              aria-label="Unidad / Categoría"
              value={unit}
              onChange={(e) => onUnitChange(e.target.value as ScoutUnit)}
              className="w-full rounded-field px-4 transition-all bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px]"
            >
              <option value="manada">Manada</option>
              <option value="tropa">Tropa</option>
              <option value="caminantes">Caminantes</option>
              <option value="clan">Clan</option>
              <option value="institucional">Institucional</option>
              <option value="no_scout">No scout</option>
            </select>
          </div>

          {/* Cédula + Sistema de Registro Query */}
          <div className="space-y-1">
            <label htmlFor="quick-identity" className="block uppercase text-xs font-bold tracking-wide text-neutral">
              Cédula de Identidad *
            </label>
            <div className="flex gap-2">
              <input
                id="quick-identity"
                aria-label="Cédula de Identidad"
                type="text"
                placeholder="Ej. V-12.345.678"
                value={identity}
                onChange={(e) => onIdentityChange(e.target.value)}
                className={`flex-1 rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${
                  errors.identity ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
                }`}
              />
              {unit !== 'no_scout' && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSearchingScraper || !identity.trim()}
                  onClick={onConsult}
                  icon={<Search className="w-4 h-4" />}
                  className="flex-shrink-0 h-[46px]"
                >
                  {isSearchingScraper ? 'Consultando...' : 'Consultar'}
                </Button>
              )}
            </div>
            {errors.identity && (
              <p className="text-xs text-red-600 font-medium mt-1">{errors.identity}</p>
            )}
            {unit === 'no_scout' && (
              <p className="text-xs text-neutral/50 italic mt-1">(No requiere verificación Sistema de Registro)</p>
            )}
            {scraperMsg && (
              <p className={`text-xs font-medium mt-1 ${scraperStatus === 'success' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {scraperMsg}
              </p>
            )}
          </div>

          {/* Nombres */}
          <div className="space-y-1">
            <label htmlFor="quick-first-names" className="block uppercase text-xs font-bold tracking-wide text-neutral">
              Nombres *
            </label>
            <input
              id="quick-first-names"
              aria-label="Nombres"
              type="text"
              placeholder="Ej. Roberto Carlos"
              value={firstNames}
              onChange={(e) => onFirstNamesChange(e.target.value)}
              className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${
                errors.firstNames ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
              }`}
            />
            {errors.firstNames && (
              <p className="text-xs text-red-600 font-medium mt-1">{errors.firstNames}</p>
            )}
          </div>

          {/* Apellidos */}
          <div className="space-y-1">
            <label htmlFor="quick-last-names" className="block uppercase text-xs font-bold tracking-wide text-neutral">
              Apellidos *
            </label>
            <input
              id="quick-last-names"
              aria-label="Apellidos"
              type="text"
              placeholder="Ej. Pérez Silva"
              value={lastNames}
              onChange={(e) => onLastNamesChange(e.target.value)}
              className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${
                errors.lastNames ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
              }`}
            />
            {errors.lastNames && (
              <p className="text-xs text-red-600 font-medium mt-1">{errors.lastNames}</p>
            )}
          </div>

          {/* Código de Reconocimiento */}
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="quick-rec-code" className="block uppercase text-xs font-bold tracking-wide text-neutral">
              Código de Reconocimiento *
            </label>
            <div className="flex gap-2">
              <input
                id="quick-rec-code"
                aria-label="Código de Reconocimiento"
                type="text"
                placeholder="REC-XXXXXX"
                value={recognitionCode}
                onChange={(e) => onRecognitionCodeChange(e.target.value)}
                className={`flex-1 rounded-field px-4 font-mono font-bold transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${
                  errors.recognitionCode ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
                }`}
              />
              <Button
                type="button"
                variant="outline"
                onClick={onRegenerateCode}
                icon={<RotateCcw className="w-4 h-4" />}
                className="flex-shrink-0 h-[46px]"
              >
                Regenerar
              </Button>
            </div>
            {errors.recognitionCode && (
              <p className="text-xs text-red-600 font-medium mt-1">{errors.recognitionCode}</p>
            )}
            <p className="text-xs text-neutral/40 mt-1">
              Código único auto-generado para verificación y reconocimiento. Puede editarse manualmente si es necesario.
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
