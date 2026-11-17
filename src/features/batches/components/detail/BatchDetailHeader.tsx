import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/Button';
import { WalkthroughHelpButton } from '../../../../components/walkthrough';
import { BatchReportBucket, ReportBucketKey } from '../../api';
import { Batch } from '../../types';
import { BatchReportControls } from './BatchReportControls';
import { ScopedExportSplitButton } from './ScopedExportSplitButton';

export interface BatchDetailHeaderProps {
  batch: Batch;
  startTour: () => void;
  onDeleteClick: () => void;
  reportBuckets: BatchReportBucket[];
  eligibleBuckets: BatchReportBucket[];
  isListEmpty: boolean;
  onDownloadMemberList: (bucketKey?: ReportBucketKey) => void;
  downloadingReport: boolean;
  onDownloadCertificatesZip: (bucketKey?: ReportBucketKey) => void;
  downloadingCertificatesZip: boolean;
  isEligibleZero: boolean;
}

export const BatchDetailHeader: React.FC<BatchDetailHeaderProps> = ({
  batch,
  startTour,
  onDeleteClick,
  reportBuckets,
  eligibleBuckets,
  isListEmpty,
  onDownloadMemberList,
  downloadingReport,
  onDownloadCertificatesZip,
  downloadingCertificatesZip,
  isEligibleZero
}) => {
  return (
    <div
      data-walkthrough="batch-detail-header"
      className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-2"
    >
      <div className="min-w-0">
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

      <div className="flex flex-wrap items-center justify-end gap-3 w-full xl:w-auto xl:ml-auto">
        <Button
          variant="outline"
          onClick={onDeleteClick}
          icon={<Trash2 size={16} />}
          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        >
          Eliminar Lote
        </Button>

        <BatchReportControls
          buckets={reportBuckets}
          downloadingReport={downloadingReport}
          isListEmpty={isListEmpty}
          onDownloadMemberList={onDownloadMemberList}
        />

        <ScopedExportSplitButton
          buckets={eligibleBuckets}
          onSelectAll={() => onDownloadCertificatesZip()}
          onSelectBucket={(bucketKey) => onDownloadCertificatesZip(bucketKey)}
          primaryLabel="Descargar Reconocimientos (ZIP)"
          loadingLabel="Generando ZIP..."
          loading={downloadingCertificatesZip}
          disabled={isEligibleZero}
          disabledTitle="No hay miembros habilitados (activos o con emisión excepcional) en este lote para generar reconocimientos"
          chevronAriaLabel="Opciones de certificados por grupo"
          menuAriaLabel="Exportar certificados por grupo"
          variant="primary"
          primaryClassName="bg-[#5c371d] hover:bg-[#4b2c17] text-white"
          chevronClassName="bg-[#5c371d] hover:bg-[#4b2c17] text-white border-l border-white/25"
          icon={<FileText size={16} />}
        />
      </div>
    </div>
  );
};
