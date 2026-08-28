import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  CheckCircle2,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { Card, CardBody } from '../../../../components/Card';
import { Button } from '../../../../components/Button';
import { getUnitLabel } from '../../types';
import { SuccessEmissionData } from '../../hooks/useQuickRecognition';

export interface QuickRecognitionSuccessProps {
  successData: SuccessEmissionData;
  onEmitAnother: () => void;
}

export const QuickRecognitionSuccess: React.FC<QuickRecognitionSuccessProps> = ({
  successData,
  onEmitAnother
}) => {
  const navigate = useNavigate();

  return (
    <Card className="shadow-sm border border-gray-200 overflow-hidden bg-white">
      <div className="bg-primary/5 border-b border-primary/10 p-8 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral">
          ¡Reconocimiento Emitido con Éxito!
        </h2>
        <p className="text-neutral/60 text-sm mt-2 max-w-md mx-auto">
          El reconocimiento individual ha sido generado y descargado automáticamente en su dispositivo.
        </p>
      </div>

      <CardBody className="p-6 sm:p-8 space-y-6">
        {/* Details Summary */}
        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/15">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs uppercase text-neutral/50 font-bold block">Homenajeado</span>
              <span className="font-bold text-neutral text-base">
                {successData.member.first_names} {successData.member.last_names}
              </span>
              <span className="text-xs text-neutral/60 block font-mono mt-0.5">
                C.I. {successData.member.identity}
              </span>
            </div>
            <div>
              <span className="text-xs uppercase text-neutral/50 font-bold block">Reconocimiento</span>
              <span className="font-bold text-primary text-base">
                {successData.recognitionName}
              </span>
              <span className="text-xs text-neutral/60 block font-mono mt-0.5">
                Código: {successData.member.recognition_code}
              </span>
            </div>
            <div>
              <span className="text-xs uppercase text-neutral/50 font-bold block">Unidad / Categoría</span>
              <span className="font-semibold text-neutral">
                {getUnitLabel(successData.member.unit)}
              </span>
            </div>
            <div>
              <span className="text-xs uppercase text-neutral/50 font-bold block">Tipo de Miembro</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                successData.member.member_type === 'young'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {successData.member.member_type === 'young' ? 'Joven' : 'Adulto'}
              </span>
            </div>
            <div>
              <span className="text-xs uppercase text-neutral/50 font-bold block">Lote Creado</span>
              <span className="font-bold text-neutral">
                Lote #{successData.batch.id}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={onEmitAnother}
            icon={<Zap className="w-4 h-4" />}
            className="w-full sm:w-auto shadow-sm"
          >
            Emitir otro reconocimiento rápido
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/lotes/${successData.batch.id}`)}
            icon={<FileText className="w-4 h-4" />}
            className="w-full sm:w-auto shadow-sm"
          >
            Ver Lote Creado
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/lotes')}
            icon={<ArrowLeft className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Ir al Listado de Lotes
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};
