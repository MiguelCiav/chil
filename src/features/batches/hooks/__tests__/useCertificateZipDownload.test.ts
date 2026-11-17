import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCertificateZipDownload } from '../useCertificateZipDownload';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useCertificateZipDownload hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in preparing phase even when initialTotal > 0 and transitions through rendering to compressing', async () => {
    const deferred = createDeferred<string>();
    let capturedOnProgress: ((p: { current: number; total: number; percentage: number }) => void) | undefined;
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useCertificateZipDownload());

    act(() => {
      void result.current.startDownload(
        async ({ onProgress }) => {
          capturedOnProgress = onProgress;
          return deferred.promise;
        },
        {
          scopeLabel: 'Grupo San Luis',
          initialTotal: 10,
          onSuccess
        }
      );
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isDownloading).toBe(true);
    expect(result.current.isCancelling).toBe(false);
    expect(result.current.phase).toBe('preparing');
    expect(result.current.scopeLabel).toBe('Grupo San Luis');
    expect(result.current.progress).toEqual({ current: 0, total: 10, percentage: 0 });

    act(() => {
      capturedOnProgress?.({ current: 4, total: 10, percentage: 40 });
    });

    expect(result.current.phase).toBe('rendering');
    expect(result.current.progress).toEqual({ current: 4, total: 10, percentage: 40 });

    act(() => {
      capturedOnProgress?.({ current: 10, total: 10, percentage: 100 });
    });

    expect(result.current.phase).toBe('compressing');
    expect(result.current.progress).toEqual({ current: 10, total: 10, percentage: 100 });

    await act(async () => {
      deferred.resolve('Reconocimientos_Lote_1.zip');
      await deferred.promise;
    });

    expect(onSuccess).toHaveBeenCalledWith('Reconocimientos_Lote_1.zip');
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.isCancelling).toBe(false);
  });

  it('blocks duplicate concurrent invocations synchronously before React re-renders', async () => {
    const deferred = createDeferred<string>();
    const taskOne = vi.fn(() => deferred.promise);
    const taskTwo = vi.fn(() => Promise.resolve('other.zip'));

    const { result } = renderHook(() => useCertificateZipDownload());

    act(() => {
      void result.current.startDownload(taskOne);
      void result.current.startDownload(taskTwo);
    });

    expect(taskOne).toHaveBeenCalledTimes(1);
    expect(taskTwo).not.toHaveBeenCalled();

    await act(async () => {
      deferred.resolve('done.zip');
      await deferred.promise;
    });
  });

  it('keeps modal open in cancelling state until AbortError settles, without calling onError or alert', async () => {
    const deferred = createDeferred<string>();
    const onError = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    let capturedSignal: AbortSignal | undefined;

    const { result } = renderHook(() => useCertificateZipDownload());

    act(() => {
      void result.current.startDownload(
        async ({ signal }) => {
          capturedSignal = signal;
          return deferred.promise;
        },
        { onError }
      );
    });

    act(() => {
      result.current.cancelDownload();
    });

    expect(capturedSignal?.aborted).toBe(true);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.isCancelling).toBe(true);
    expect(result.current.phase).toBe('cancelling');

    await act(async () => {
      deferred.reject(new DOMException('Operación cancelada', 'AbortError'));
      try {
        await deferred.promise;
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(false);
    });
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.isCancelling).toBe(false);
    expect(onError).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('forwards non-abort errors to onError or falls back to window.alert', async () => {
    const onError = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCertificateZipDownload());

    await act(async () => {
      await result.current.startDownload(
        async () => {
          throw new Error('Custom error');
        },
        { onError }
      );
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);

    await act(async () => {
      await result.current.startDownload(async () => {
        throw new Error('Unhandled error');
      });
    });

    expect(alertSpy).toHaveBeenCalledWith('Error al generar los reconocimientos en ZIP.');
    alertSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('aborts active task on unmount cleanly', () => {
    const deferred = createDeferred<string>();
    let capturedSignal: AbortSignal | undefined;

    const { result, unmount } = renderHook(() => useCertificateZipDownload());

    act(() => {
      void result.current.startDownload(async ({ signal }) => {
        capturedSignal = signal;
        return deferred.promise;
      });
    });

    expect(capturedSignal?.aborted).toBe(false);
    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
