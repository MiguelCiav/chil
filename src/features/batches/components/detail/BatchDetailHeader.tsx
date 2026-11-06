import React from 'react';
import { Download, FileText, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/Button';
import { WalkthroughHelpButton } from '../../../../components/walkthrough';
import { Batch } from '../../types';

export interface BatchDetailHeaderProps {
  batch: Batch;
  startTour: () => void;
  onDeleteClick: () => void;
  onDownloadMemberList: () => void;
  downloadingReport: boolean;
  onDownloadCertificatesZip: () => void;
  downloadingCertificatesZip: boolean;
  isEligibleZero: boolean;
}

export const BatchDetailHeader: React.FC<BatchDetailHeaderProps> = ({
  batch,
  startTour,
  onDeleteClick,
  onDownloadMemberList,
  downloadingReport,
  onDownloadCertificatesZip,
  downloadingCertificatesZip,
  isEligibleZero
}) => {
  return (
    <div
      data-walkthrough="batch-detail-header"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2"
    >
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight">
            Lote #{batch.id}
          </h1>
          <WalkthroughHelpButton onClick={startTour} />
          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
            {`LT-${new Date(batch.created_at).getFullYear()}-${String(batch.id).padStart(3, '0')}`}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-neutral/70 mt-1">
          Revisión y gestión de reconocimientos del lote actual.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={onDeleteClick}
          icon={<Trash2 size={16} />}
          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        >
          Eliminar Lote
        </Button>

        <Button
          variant="outline"
          onClick={onDownloadMemberList}
          disabled={downloadingReport}
          icon={<Download size={16} />}
          className="border-gray-200 hover:bg-gray-50 text-neutral"
        >
          {downloadingReport ? 'Generando PDF...' : 'Descargar lista'}
        </Button>

        <Button
          variant="primary"
          onClick={onDownloadCertificatesZip}
          disabled={downloadingCertificatesZip || isEligibleZero}
          title={
            isEligibleZero
              ? 'No hay miembros habilitados (activos o con emisión excepcional) en este lote para generar reconocimientos'
              : undefined
          }
          icon={<FileText size={16} />}
          className="bg-[#5c371d] hover:bg-[#4b2c17] text-white"
        >
          {downloadingCertificatesZip ? 'Generando ZIP...' : 'Descargar Reconocimientos (ZIP)'}
        </Button>
      </div>
    </div>
  );
};
