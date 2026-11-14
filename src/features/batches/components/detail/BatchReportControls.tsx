import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Button } from '../../../../components/Button';
import { BatchReportBucket, ReportBucketKey } from '../../api';

export interface BatchReportControlsProps {
  buckets: BatchReportBucket[];
  downloadingReport: boolean;
  isListEmpty: boolean;
  onDownloadMemberList: (bucketKey?: ReportBucketKey) => void;
}

/**
 * Renders the Batch Detail PDF list export controls: a 1-click full-batch button
 * plus an adjacent "Por grupo" popover menu when the batch spans multiple buckets.
 */
export const BatchReportControls: React.FC<BatchReportControlsProps> = ({
  buckets,
  downloadingReport,
  isListEmpty,
  onDownloadMemberList
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDisabled = downloadingReport || isListEmpty;
  const hasMultipleBuckets = buckets.length > 1;
  const menuOpen = isOpen && hasMultipleBuckets && !isDisabled;

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const hasGroupBuckets = buckets.some((b) => b.kind === 'group');
  const firstSpecialIndex = buckets.findIndex((b) => b.kind !== 'group');

  return (
    <div ref={containerRef} className="relative inline-flex flex-wrap items-center justify-end gap-2">
      <Button
        variant="outline"
        onClick={() => onDownloadMemberList()}
        disabled={isDisabled}
        title={isListEmpty ? 'No hay miembros en este lote para generar la lista' : undefined}
        icon={<Download size={16} />}
        className="border-gray-200 hover:bg-gray-50 text-neutral"
      >
        {downloadingReport ? 'Generando PDF...' : 'Descargar lista (PDF)'}
      </Button>

      {hasMultipleBuckets && (
        <Button
          variant="outline"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={isDisabled}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          icon={
            <ChevronDown
              size={16}
              className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            />
          }
          iconPosition="right"
          className="border-gray-200 hover:bg-gray-50 text-neutral"
        >
          Por grupo
        </Button>
      )}

      {menuOpen && (
        <div
          role="menu"
          aria-label="Exportar lista por grupo"
          className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-40"
        >
          {buckets.map((bucket, index) => {
            const showDivider = hasGroupBuckets && index === firstSpecialIndex;
            const showDistrict =
              bucket.districtName !== null && bucket.districtName !== 'No aplica';

            return (
              <React.Fragment key={bucket.key}>
                {showDivider && <div className="my-1 border-t border-gray-100" role="separator" />}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    onDownloadMemberList(bucket.key);
                  }}
                  className="w-full px-3.5 py-2 flex items-center justify-between gap-2 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-neutral truncate">
                      {bucket.label}
                    </span>
                    {showDistrict && (
                      <span className="block text-xs text-neutral/60 truncate">
                        {bucket.districtName}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary shrink-0">
                    {bucket.members.length}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
