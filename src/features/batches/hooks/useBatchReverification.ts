import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ToastVariant } from '../../../components/Toast';
import {
  getMemberStatus,
  getMembersByBatchId,
  isScraperSessionError,
  saveBatchMemberUpdates,
  type MemberUpdateEntry,
  type ScraperMemberDetails
} from '../api';
import { Batch, BatchCodeMode, ScoutMember } from '../types';
import {
  generateUniqueRecognitionCode,
  inferBatchCodeMode
} from '../utils/codeGenerator';
import { getMemberDocId, normalizeCedula } from '../utils/memberIdentity';
import {
  VERIFICATION_POOL_CONCURRENCY,
  VerificationProgress,
  applyReverificationResult,
  isReverifiableMember,
  runVerificationPool
} from '../utils/scraperVerificationPool';
import type { UseScraperSessionGuardResult } from './useScraperSessionGuard';

export interface StagedManualActivation {
  previous: ScoutMember;
  member: ScoutMember;
  previousCode?: string;
  wasExceptional: boolean;
}

export interface UseBatchReverificationParams {
  batch: Batch | null;
  members: ScoutMember[];
  userId?: string;
  onMembersChanged: (members: ScoutMember[]) => void;
  triggerToast: (msg: string, durationMs?: number, variant?: ToastVariant) => void;
  sessionGuard: UseScraperSessionGuardResult;
}

type SingleScrapeAttempt =
  | { ok: true; details: ScraperMemberDetails | null }
  | { ok: false; error: string };

export function useBatchReverification({
  batch,
  members,
  userId,
  onMembersChanged,
  triggerToast,
  sessionGuard
}: UseBatchReverificationParams) {
  const [isReverifying, setIsReverifying] = useState(false);
  const [reverifyProgress, setReverifyProgress] = useState<VerificationProgress | null>(null);
  const [stagedManualItems, setStagedManualItems] = useState<StagedManualActivation[]>([]);
  const [stagedSessionExpiredNotice, setStagedSessionExpiredNotice] = useState(false);
  const [savingManualCodes, setSavingManualCodes] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const batchCodeMode: BatchCodeMode = useMemo(
    () => inferBatchCodeMode(members, batch),
    [members, batch]
  );

  const reverifiableMembers = useMemo(
    () => members.filter(isReverifiableMember),
    [members]
  );

  const manualModalExistingCodes = useMemo(() => {
    const stagedDocIds = new Set(stagedManualItems.map((item) => getMemberDocId(item.previous)));
    return members
      .filter((m) => !stagedDocIds.has(getMemberDocId(m)))
      .map((m) => m.recognition_code?.trim() ?? '')
      .filter(Boolean);
  }, [members, stagedManualItems]);

  const runReverificationFor = useCallback(
    async (targets: ScoutMember[]) => {
      if (!batch || targets.length === 0 || isReverifying) {
        return;
      }

      const hasActiveSession = await sessionGuard.ensureActiveSession();
      if (!hasActiveSession || cancelledRef.current) {
        return;
      }

      const targetUserId = batch.user_id ?? userId;
      setIsReverifying(true);
      setReverifyProgress({ current: 0, total: targets.length });
      sessionGuard.clearAuthError();

      try {
        const { results, sessionError } = await runVerificationPool<
          ScoutMember,
          SingleScrapeAttempt
        >({
          items: targets,
          concurrency: VERIFICATION_POOL_CONCURRENCY,
          shouldAbort: isScraperSessionError,
          isCancelled: () => cancelledRef.current,
          onProgress: (progress) => {
            if (!cancelledRef.current) {
              setReverifyProgress(progress);
            }
          },
          verifyItem: async (member) => {
            try {
              const details = await getMemberStatus(normalizeCedula(member.identity));
              return { ok: true, details };
            } catch (err) {
              if (isScraperSessionError(err)) {
                throw err;
              }
              const errStr = err instanceof Error ? err.message : String(err);
              if (errStr.includes('No registrado')) {
                return { ok: true, details: null };
              }
              return { ok: false, error: errStr };
            }
          }
        });

        if (cancelledRef.current) {
          return;
        }

        const refreshedPendingUpdates: MemberUpdateEntry[] = [];
        const newlyActiveItems: StagedManualActivation[] = [];
        let networkErrorCount = 0;

        for (const member of targets) {
          const attempt = results.get(member);
          if (!attempt) continue;
          if (!attempt.ok) {
            networkErrorCount += 1;
            continue;
          }

          const outcome = applyReverificationResult(member, attempt.details, {
            batchId: batch.id,
            userId: targetUserId
          });

          if (outcome.kind === 'refreshed_pending') {
            refreshedPendingUpdates.push({ previous: member, next: outcome.member });
          } else if (outcome.kind === 'activated') {
            newlyActiveItems.push({
              previous: member,
              member: outcome.member,
              previousCode: outcome.previousCode,
              wasExceptional: outcome.wasExceptional
            });
          }
        }

        // Always commit code-free refreshedPending updates immediately
        if (refreshedPendingUpdates.length > 0) {
          await saveBatchMemberUpdates(refreshedPendingUpdates, targetUserId);
          if (!cancelledRef.current) {
            const refreshed = await getMembersByBatchId(batch.id);
            onMembersChanged(refreshed);
          }
        }

        if (cancelledRef.current) {
          return;
        }

        if (newlyActiveItems.length === 0) {
          if (sessionError) {
            sessionGuard.handleScraperSessionFailure(sessionError);
            return;
          }
          if (refreshedPendingUpdates.length > 0 && networkErrorCount > 0) {
            triggerToast(
              `Se actualizaron ${refreshedPendingUpdates.length} registro(s) pendiente(s), con ${networkErrorCount} error(es) de red.`,
              5000,
              'warning'
            );
          } else if (refreshedPendingUpdates.length > 0) {
            triggerToast(
              `Se actualizaron los datos de ${refreshedPendingUpdates.length} miembro(s) pendiente(s) desde Impeesa.`,
              4000,
              'success'
            );
          } else if (networkErrorCount > 0) {
            triggerToast(
              `No se pudieron verificar ${networkErrorCount} miembro(s) por error de conexión.`,
              5000,
              'warning'
            );
          } else {
            triggerToast('No se encontraron cambios de solvencia en Impeesa.', 3500, 'warning');
          }
          return;
        }

        if (batchCodeMode === 'auto') {
          const newlyActiveDocIds = new Set(
            newlyActiveItems.map((item) => getMemberDocId(item.previous))
          );
          const usedCodes = new Set<string>(
            members
              .filter((m) => !newlyActiveDocIds.has(getMemberDocId(m)))
              .map((m) => m.recognition_code?.trim().toUpperCase() ?? '')
              .filter(Boolean)
          );

          const autoUpdates: MemberUpdateEntry[] = newlyActiveItems.map((item) => {
            const newCode = generateUniqueRecognitionCode(
              usedCodes,
              item.previousCode ? [item.previousCode] : undefined
            );
            usedCodes.add(newCode.toUpperCase());
            return {
              previous: item.previous,
              next: {
                ...item.member,
                recognition_code: newCode
              }
            };
          });

          await saveBatchMemberUpdates(autoUpdates, targetUserId);
          if (cancelledRef.current) {
            return;
          }
          const updatedMembers = await getMembersByBatchId(batch.id);
          onMembersChanged(updatedMembers);

          if (sessionError) {
            sessionGuard.handleScraperSessionFailure(sessionError);
          }

          const promotedExceptionalCount = newlyActiveItems.filter(
            (item) => item.wasExceptional
          ).length;
          if (promotedExceptionalCount > 0) {
            triggerToast(
              `${newlyActiveItems.length} miembro(s) activado(s) con nuevo código. Recuerda volver a descargar el certificado PDF actualizado.`,
              6000,
              'warning'
            );
          } else if (networkErrorCount > 0) {
            triggerToast(
              `${newlyActiveItems.length} miembro(s) activado(s) exitosamente (${networkErrorCount} error(es) de red).`,
              5000,
              'warning'
            );
          } else {
            triggerToast(
              `${newlyActiveItems.length} miembro(s) verificado(s) y activado(s) desde Impeesa.`,
              4000,
              'success'
            );
          }
          return;
        }

        // Manual code mode: open ManualCodeAssignmentModal alone (never stacked with ScraperAlertModals)
        if (sessionError) {
          const isNotConfigured =
            isScraperSessionError(sessionError) &&
            sessionError.reason === 'SCRAPER_NOT_CONFIGURED';
          sessionGuard.markSessionExpired(isNotConfigured);
          setStagedSessionExpiredNotice(true);
        } else {
          setStagedSessionExpiredNotice(false);
        }
        setStagedManualItems(newlyActiveItems);
      } catch (err) {
        console.error('Error during batch re-verification:', err);
        if (!cancelledRef.current) {
          triggerToast('Error al re-verificar miembros contra Impeesa.', 4000, 'error');
        }
      } finally {
        if (!cancelledRef.current) {
          setIsReverifying(false);
          setReverifyProgress(null);
        }
      }
    },
    [batch, batchCodeMode, isReverifying, members, onMembersChanged, sessionGuard, triggerToast, userId]
  );

  const handleReverifyAll = useCallback(() => {
    void runReverificationFor(reverifiableMembers);
  }, [reverifiableMembers, runReverificationFor]);

  const handleReverifySingle = useCallback(
    (member: ScoutMember) => {
      if (!isReverifiableMember(member)) return;
      void runReverificationFor([member]);
    },
    [runReverificationFor]
  );

  const handleConfirmManualCodes = useCallback(
    async (assignedCodesByDocId: Record<string, string>) => {
      if (!batch || stagedManualItems.length === 0) return;
      setSavingManualCodes(true);
      try {
        const targetUserId = batch.user_id ?? userId;
        const updates: MemberUpdateEntry[] = stagedManualItems.map((item) => {
          const docId = getMemberDocId(item.previous);
          return {
            previous: item.previous,
            next: {
              ...item.member,
              recognition_code: assignedCodesByDocId[docId]
            }
          };
        });

        await saveBatchMemberUpdates(updates, targetUserId);
        const refreshed = await getMembersByBatchId(batch.id);
        onMembersChanged(refreshed);

        const promotedExceptional = stagedManualItems.some((item) => item.wasExceptional);
        const activatedCount = stagedManualItems.length;
        setStagedManualItems([]);
        setStagedSessionExpiredNotice(false);

        if (promotedExceptional) {
          triggerToast(
            `${activatedCount} miembro(s) activado(s) con nuevo código. Recuerda volver a descargar el certificado PDF actualizado.`,
            6000,
            'warning'
          );
        } else {
          triggerToast(
            `${activatedCount} miembro(s) activado(s) con código asignado.`,
            4000,
            'success'
          );
        }
      } catch (err) {
        console.error('Error saving manual codes after re-verification:', err);
        triggerToast('Error al guardar los códigos asignados.', 4000, 'error');
      } finally {
        setSavingManualCodes(false);
      }
    },
    [batch, onMembersChanged, stagedManualItems, triggerToast, userId]
  );

  const handleCancelManualCodes = useCallback(() => {
    if (savingManualCodes) return;
    setStagedManualItems([]);
    setStagedSessionExpiredNotice(false);
  }, [savingManualCodes]);

  return {
    batchCodeMode,
    reverifiableMembers,
    isReverifying,
    reverifyProgress,
    stagedManualItems,
    stagedSessionExpiredNotice,
    savingManualCodes,
    manualModalExistingCodes,
    handleReverifyAll,
    handleReverifySingle,
    handleConfirmManualCodes,
    handleCancelManualCodes
  };
}
