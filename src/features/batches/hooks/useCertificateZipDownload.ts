import { useCallback, useEffect, useRef, useState } from 'react';
import { BatchGenerationProgress } from '../../recognitions';

export type CertificateZipPhase = 'preparing' | 'rendering' | 'compressing' | 'cancelling';

export interface StartCertificateZipOptions {
  scopeLabel?: string;
  initialTotal?: number;
  onSuccess?: (fileName: string) => void;
  onError?: (err: unknown) => void;
}

export interface UseCertificateZipDownloadReturn {
  isOpen: boolean;
  isDownloading: boolean;
  isCancelling: boolean;
  phase: CertificateZipPhase;
  scopeLabel?: string;
  progress: BatchGenerationProgress;
  startDownload: (
    task: (ctx: {
      onProgress: (progress: BatchGenerationProgress) => void;
      signal: AbortSignal;
    }) => Promise<string>,
    options?: StartCertificateZipOptions
  ) => Promise<void>;
  cancelDownload: () => void;
}

const INITIAL_PROGRESS: BatchGenerationProgress = {
  current: 0,
  total: 0,
  percentage: 0
};

/**
 * Coordinates progress tracking, AbortController cancellation, and modal state
 * for long-running certificate ZIP exports.
 */
export function useCertificateZipDownload(): UseCertificateZipDownloadReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [phase, setPhase] = useState<CertificateZipPhase>('preparing');
  const [scopeLabel, setScopeLabel] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState<BatchGenerationProgress>(INITIAL_PROGRESS);

  const abortControllerRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  const cancelDownload = useCallback(() => {
    if (!abortControllerRef.current) return;
    setIsCancelling(true);
    setPhase('cancelling');
    abortControllerRef.current.abort();
  }, []);

  const startDownload = useCallback(
    async (
      task: (ctx: {
        onProgress: (progress: BatchGenerationProgress) => void;
        signal: AbortSignal;
      }) => Promise<string>,
      options?: StartCertificateZipOptions
    ) => {
      if (abortControllerRef.current !== null) {
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      setIsOpen(true);
      setIsDownloading(true);
      setIsCancelling(false);
      setPhase('preparing');
      setScopeLabel(options?.scopeLabel);
      setProgress({
        current: 0,
        total: options?.initialTotal ?? 0,
        percentage: 0
      });

      const handleProgress = (next: BatchGenerationProgress) => {
        if (runIdRef.current !== runId || controller.signal.aborted) {
          return;
        }
        setProgress(next);
        setPhase(next.total > 0 && next.current === next.total ? 'compressing' : 'rendering');
      };

      try {
        const fileName = await task({
          onProgress: handleProgress,
          signal: controller.signal
        });

        if (runIdRef.current === runId && !controller.signal.aborted) {
          options?.onSuccess?.(fileName);
        }
      } catch (err) {
        if ((err as Error | undefined)?.name === 'AbortError') {
          return;
        }
        if (runIdRef.current === runId) {
          if (options?.onError) {
            options.onError(err);
          } else {
            console.error('Error generating certificate ZIP:', err);
            alert('Error al generar los reconocimientos en ZIP.');
          }
        }
      } finally {
        if (runIdRef.current === runId) {
          abortControllerRef.current = null;
          setIsOpen(false);
          setIsDownloading(false);
          setIsCancelling(false);
        }
      }
    },
    []
  );

  return {
    isOpen,
    isDownloading,
    isCancelling,
    phase,
    scopeLabel,
    progress,
    startDownload,
    cancelDownload
  };
}
