import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { Button } from '../../../../components/Button';
import { BatchGenerationProgress } from '../../../recognitions';
import { CertificateZipPhase } from '../../hooks/useCertificateZipDownload';

export interface CertificateZipProgressModalProps {
  isOpen: boolean;
  phase: CertificateZipPhase;
  progress: BatchGenerationProgress;
  isCancelling: boolean;
  scopeLabel?: string;
  onCancel: () => void;
}

function getPhaseStatusText(phase: CertificateZipPhase, isCancelling: boolean): string {
  if (isCancelling || phase === 'cancelling') {
    return 'Cancelando...';
  }
  if (phase === 'preparing') {
    return 'Preparando lote...';
  }
  if (phase === 'compressing') {
    return 'Comprimiendo archivo ZIP...';
  }
  return 'Generando PDFs individuales...';
}

/**
 * Displays live certificate ZIP generation counts and a cancellation trigger.
 */
export const CertificateZipProgressModal: React.FC<CertificateZipProgressModalProps> = ({
  isOpen,
  phase,
  progress,
  isCancelling,
  scopeLabel,
  onCancel
}) => {
  const statusText = getPhaseStatusText(phase, isCancelling);
  const clampedPercentage = Math.min(100, Math.max(0, progress.percentage));
  const counterText = `${progress.current} / ${progress.total} (${progress.percentage}%)`;
  const valueText = progress.total > 0 ? `${statusText} ${counterText}` : statusText;

  return (
    <Modal isOpen={isOpen} onClose={() => {}} className="max-w-md">
      <ModalHeader>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-lg font-bold text-neutral">
            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            <span>Generando certificados</span>
          </div>
          {scopeLabel && (
            <p className="text-xs font-medium text-neutral/60">{scopeLabel}</p>
          )}
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        <div className="flex items-center justify-between gap-3 text-sm" aria-live="polite">
          <span className="font-medium text-neutral/80">{statusText}</span>
          {progress.total > 0 && (
            <span className="font-mono font-bold text-neutral shrink-0">{counterText}</span>
          )}
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percentage}
          aria-valuetext={valueText}
          className="w-full h-3 bg-primary/10 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-200"
            style={{ width: `${clampedPercentage}%` }}
          />
        </div>
      </ModalBody>

      <ModalFooter className="!justify-end">
        <Button
          variant="outline"
          className="ml-auto"
          onClick={onCancel}
          disabled={isCancelling}
        >
          Cancelar
        </Button>
      </ModalFooter>
    </Modal>
  );
};
