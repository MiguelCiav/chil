import React from 'react';
import { MapPin, Award, Users, MessageSquare } from 'lucide-react';
import { Card, CardBody } from '../../../../components/Card';
import { Batch, Region, District, ScoutGroup, ScoutUnit, getUnitLabel } from '../../types';

export interface BatchSummaryCardsProps {
  batch: Batch;
  totals: {
    total: number;
    young: number;
    adult: number;
    valid: number;
    exceptional: number;
    eligible: number;
    pending: number;
  };
  recognitionTitle: string;
  regions: Region[];
  districts: District[];
  groups: ScoutGroup[];
}

export const BatchSummaryCards: React.FC<BatchSummaryCardsProps> = ({
  batch,
  totals,
  recognitionTitle,
  regions,
  districts,
  groups
}) => {
  const getRegionName = (regId: number) => {
    if (!regId || regId === 0) return 'No aplica';
    const found = regions.find((r) => r.id === regId);
    return found?.name || `Región ${regId}`;
  };

  const getDistrictName = (distId: number) => {
    if (!distId || distId === 0) return 'No aplica';
    const found = districts.find((d) => d.id === distId);
    return found?.name || `Distrito ${distId}`;
  };

  const getGroupName = (grpId: number) => {
    if (!grpId || grpId === 0) return 'No aplica';
    const found = groups.find((g) => g.id === grpId);
    return found?.name || `Grupo ${grpId}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Card 1: Detalles del Lote */}
      <Card className="shadow-sm border-gray-200">
        <CardBody className="p-6 flex flex-col h-full min-h-[140px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#f5ede2] text-[#935f3b] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-neutral text-base">Detalles del Lote</h2>
          </div>

          <div className="space-y-2 text-xs sm:text-sm my-auto">
            <div className="flex justify-between items-center text-neutral/60">
              <span>Alcance de Unidad</span>
              <span className="font-semibold text-neutral">
                {batch.unit_scope === 'mixed' || !batch.unit_scope
                  ? 'Mixto (Todas las unidades)'
                  : getUnitLabel(batch.unit_scope as ScoutUnit)}
              </span>
            </div>
            <div className="flex justify-between items-center text-neutral/60">
              <span>Región</span>
              <span className="font-semibold text-neutral">{getRegionName(batch.region_id)}</span>
            </div>
            <div className="flex justify-between items-center text-neutral/60">
              <span>Distrito</span>
              <span className="font-semibold text-neutral">{getDistrictName(batch.district_id)}</span>
            </div>
            <div className="flex justify-between items-center text-neutral/60">
              <span>Grupo</span>
              <span className="font-semibold text-neutral">{getGroupName(batch.group_id)}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Card 2: Tipo de Reconocimiento */}
      <Card className="shadow-sm border-gray-200">
        <CardBody className="p-6 flex flex-col h-full min-h-[140px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#f5ede2] text-[#935f3b] flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-neutral text-base">Tipo de Reconocimiento</h2>
          </div>

          <div className="text-center my-auto py-2">
            <div className="text-xl sm:text-2xl font-extrabold text-[#743e1d]">
              {recognitionTitle}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Card 3: Resumen de Miembros */}
      <Card className="shadow-sm border-gray-200">
        <CardBody className="p-6 flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e6f0fa] text-[#0284c7] flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-neutral text-base">Resumen de Miembros</h2>
          </div>

          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl sm:text-3xl font-black text-neutral">
                {totals.total}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-neutral/50">Total</span>
            </div>

            {/* Sub-grid Adultos & Jóvenes */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-[#f5f5f4] rounded-xl p-2 px-3">
                <div className="text-[10px] font-bold text-neutral/50 uppercase">Adultos</div>
                <div className="text-sm font-extrabold text-neutral">{totals.adult}</div>
              </div>
              <div className="bg-[#f5f5f4] rounded-xl p-2 px-3">
                <div className="text-[10px] font-bold text-neutral/50 uppercase">Jóvenes</div>
                <div className="text-sm font-extrabold text-neutral">{totals.young}</div>
              </div>
            </div>

            {/* Sin registrar alert box */}
            <div className="bg-[#feeae8] border border-[#fccfca] rounded-xl px-3 py-1.5 flex justify-between items-center text-xs font-bold text-[#c92a2a]">
              <span>Sin registrar</span>
              <span className="text-sm font-black">{totals.pending}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Card 4: Comentarios / Observaciones */}
      <Card className="shadow-sm border-gray-200">
        <CardBody className="p-6 flex flex-col h-full min-h-[140px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#f5ede2] text-[#935f3b] flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-neutral text-base">Comentarios / Observaciones</h2>
          </div>

          <div className="my-auto text-xs sm:text-sm text-neutral/80 break-words">
            {batch.comment && batch.comment.trim().length > 0 ? (
              <p className="whitespace-pre-wrap font-medium">{batch.comment}</p>
            ) : (
              <p className="italic text-neutral/40">Sin observaciones registradas</p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
