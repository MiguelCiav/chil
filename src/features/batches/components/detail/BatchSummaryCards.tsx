import React from 'react';
import { Award, Users, MessageSquare } from 'lucide-react';
import { Card, CardBody } from '../../../../components/Card';
import { Batch } from '../../types';

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
}

export const BatchSummaryCards: React.FC<BatchSummaryCardsProps> = ({
  batch,
  totals,
  recognitionTitle
}) => {
  return (
    <div
      data-walkthrough="batch-detail-summary-cards"
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      {/* Card 1: Tipo de Reconocimiento */}
      <Card>
        <CardBody className="p-6 flex flex-col h-full min-h-[140px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-neutral text-base">Tipo de Reconocimiento</h2>
          </div>

          <div className="text-center my-auto py-2">
            <div className="text-xl sm:text-2xl font-extrabold text-primary">
              {recognitionTitle}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Card 2: Resumen de Miembros */}
      <Card>
        <CardBody className="p-6 flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-700 flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-neutral text-base">Resumen de Miembros</h2>
          </div>

          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl sm:text-3xl font-black text-neutral">
                {totals.total}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-neutral/75">Total</span>
            </div>

            {/* Sub-grid Adultos & Jóvenes */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-primary/5 rounded-xl p-2 px-3">
                <div className="text-xs font-bold text-neutral/75 uppercase">Adultos</div>
                <div className="text-sm font-extrabold text-neutral">{totals.adult}</div>
              </div>
              <div className="bg-primary/5 rounded-xl p-2 px-3">
                <div className="text-xs font-bold text-neutral/75 uppercase">Jóvenes</div>
                <div className="text-sm font-extrabold text-neutral">{totals.young}</div>
              </div>
            </div>

            {/* Sin registrar alert box */}
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 flex justify-between items-center text-xs font-bold text-rose-800">
              <span>Sin registrar</span>
              <span className="text-sm font-black">{totals.pending}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Card 3: Comentarios / Observaciones */}
      <Card>
        <CardBody className="p-6 flex flex-col h-full min-h-[140px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-neutral text-base">Comentarios / Observaciones</h2>
          </div>

          <div className="my-auto text-xs sm:text-sm text-neutral/80 break-words">
            {batch.comment && batch.comment.trim().length > 0 ? (
              <p className="whitespace-pre-wrap font-medium">{batch.comment}</p>
            ) : (
              <p className="italic text-neutral/75">Sin observaciones registradas</p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
