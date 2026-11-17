import React from 'react';
import { Download } from 'lucide-react';
import { BatchReportBucket, ReportBucketKey } from '../../api';
import { ScopedExportSplitButton } from './ScopedExportSplitButton';

export interface BatchReportControlsProps {
  buckets: BatchReportBucket[];
  downloadingReport: boolean;
  isListEmpty: boolean;
  onDownloadMemberList: (bucketKey?: ReportBucketKey) => void;
}

/**
 * Renders the Batch Detail PDF list export controls: a split button whose main action
 * downloads the full batch list and whose attached chevron opens a "Por grupo" menu
 * when the batch spans multiple buckets.
 */
export const BatchReportControls: React.FC<BatchReportControlsProps> = ({
  buckets,
  downloadingReport,
  isListEmpty,
  onDownloadMemberList
}) => {
  return (
    <ScopedExportSplitButton
      buckets={buckets}
      onSelectAll={() => onDownloadMemberList()}
      onSelectBucket={(bucketKey) => onDownloadMemberList(bucketKey)}
      primaryLabel="Descargar lista (PDF)"
      loadingLabel="Generando PDF..."
      loading={downloadingReport}
      disabled={isListEmpty}
      disabledTitle="No hay miembros en este lote para generar la lista"
      chevronAriaLabel="Opciones de lista por grupo"
      menuAriaLabel="Exportar lista por grupo"
      variant="outline"
      primaryClassName="border-gray-200 hover:bg-gray-50 text-neutral"
      chevronClassName="border-gray-200 hover:bg-gray-50 text-neutral border-l-0"
      icon={<Download size={16} />}
    />
  );
};
