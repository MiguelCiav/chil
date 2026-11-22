import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table';
import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '../../../components/Button';
import { Toast } from '../../../components/Toast';
import {
  useWalkthrough,
  WalkthroughOverlay
} from '../../../components/walkthrough';
import {
  getBatchById,
  getMembersByBatchId,
  updateMember,
  deleteBatch,
  getHierarchyData,
  generateBatchReport,
  resolveBatchReportBuckets,
  filterEligibleReportBuckets,
  ReportBucketKey,
  getRecognitionName
} from '../api';
import {
  Batch,
  ScoutMember,
  Region,
  District,
  ScoutGroup
} from '../types';
import {
  generateBatchCertificatesZip,
  downloadSingleCertificatePdf,
  getAllRecognitionTypes,
  RecognitionType
} from '../../recognitions';
import { useAuth } from '../../auth';

import {
  BATCH_DETAIL_TOUR_STEPS,
  createBatchDetailColumns,
  BatchDetailHeader,
  BatchMembersTable,
  BatchSummaryCards,
  BatchTerritorialCard,
  DeleteBatchModal,
  EditMemberModal,
  MemberQuickViewModal,
  BatchDetailTotals
} from './detail';
import { CertificateZipProgressModal } from './shared';
import { useCertificateZipDownload } from '../hooks/useCertificateZipDownload';
import { calculateBatchTerritorialBreakdown } from '../utils/batchTerritorial';

export const BatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const batchId = Number(id);

  const {
    isOpen: isTourOpen,
    currentStep,
    currentStepIndex,
    totalSteps,
    targetRect,
    startTour,
    nextStep,
    prevStep,
    skipTour
  } = useWalkthrough({
    tourId: 'batch-detail-tour',
    steps: BATCH_DETAIL_TOUR_STEPS,
    autoStart: false,
    userId: user?.uid
  });

  const [batch, setBatch] = useState<Batch | null>(null);
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [loading, setLoading] = useState(!Number.isNaN(Number(id)));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const zipDownload = useCertificateZipDownload();
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = useCallback((msg: string, durationMs = 3000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    setShowToast(true);
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, durationMs);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Dropdown action menu per member row
  const [activeMenuMemberId, setActiveMenuMemberId] = useState<string | null>(null);

  // Quick View Member Modal
  const [viewingMember, setViewingMember] = useState<ScoutMember | null>(null);

  // Editing Member Modal
  const [editingMember, setEditingMember] = useState<ScoutMember | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Recognition template cache
  const [recognition, setRecognition] = useState<RecognitionType | null>(null);

  // Hierarchy cache
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);

  const loadBatchDetails = useCallback(() => {
    if (Number.isNaN(batchId)) {
      return;
    }

    setLoading(true);
    setLoadError(null);
    Promise.all([
      getBatchById(batchId),
      getMembersByBatchId(batchId),
      getHierarchyData(),
      getAllRecognitionTypes(user?.uid)
    ])
      .then(([b, m, hierarchy, recTypes]) => {
        setBatch(b);
        setMembers(m);
        setRegions(hierarchy.regions);
        setDistricts(hierarchy.districts);
        setGroups(hierarchy.groups);
        if (b?.recognition_type) {
          const found = recTypes.find(
            (r) =>
              r.id === b.recognition_type ||
              r.name.toLowerCase() === b.recognition_type?.toLowerCase()
          );
          setRecognition(found || null);
        }
      })
      .catch((err) => {
        console.error('Error loading batch details:', err);
        setLoadError('No se pudo cargar la información del lote.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [batchId, user?.uid]);

  useEffect(() => {
    loadBatchDetails();
  }, [loadBatchDetails]);

  const handleDownloadPDF = (bucketKey?: ReportBucketKey) => {
    if (!batch) return;
    const targetBucket = bucketKey
      ? eligibleBuckets.find((b) => b.key === bucketKey)
      : undefined;
    if (bucketKey && !targetBucket) {
      return;
    }

    void zipDownload.startDownload(
      ({ onProgress, signal }) =>
        generateBatchCertificatesZip({
          batch,
          members: targetBucket ? targetBucket.members : members,
          recognition,
          hierarchy: { regions, districts, groups },
          bucketSlug: targetBucket?.label,
          onProgress,
          signal
        }),
      {
        scopeLabel: targetBucket ? targetBucket.label : `Lote #${batch.id}`,
        initialTotal: targetBucket ? targetBucket.members.length : totals.eligible,
        onSuccess: (fileName) => {
          triggerToast(`¡Reconocimientos descargados exitosamente en ${fileName}!`, 4000);
        },
        onError: (err) => {
          console.error('Error generating ZIP:', err);
          alert('Error al generar los reconocimientos en ZIP.');
        }
      }
    );
  };

  const handleDownloadSingleRecognition = useCallback(
    async (member: ScoutMember) => {
      setActiveMenuMemberId(null);
      if (!batch) return;
      try {
        const fileName = await downloadSingleCertificatePdf({
          member,
          batch,
          recognition,
          hierarchy: { regions, districts, groups }
        });
        triggerToast(`¡Reconocimiento descargado: ${fileName}!`);
      } catch (err) {
        console.error('Error generating single recognition:', err);
        alert('Error al descargar el reconocimiento.');
      }
    },
    [batch, recognition, regions, districts, groups, triggerToast]
  );

  const handleDownloadMemberListPDF = async (bucketKey?: ReportBucketKey) => {
    if (!batch) return;
    setDownloadingReport(true);
    try {
      if (bucketKey) {
        await generateBatchReport(
          batch,
          members,
          { regions, districts, groups },
          { bucketKey }
        );
      } else {
        await generateBatchReport(batch, members, { regions, districts, groups });
      }
      triggerToast('Lista de miembros (PDF) generada exitosamente.');
    } catch (err) {
      console.error('Error generating member list PDF:', err);
      alert('Error al generar la lista de miembros en PDF.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleEditClick = useCallback((member: ScoutMember) => {
    setActiveMenuMemberId(null);
    setEditingMember({ ...member });
    setIsEditModalOpen(true);
  }, []);

  const handleSaveMemberEdit = async (updatedMember: ScoutMember) => {
    if (!batch) return;

    try {
      await updateMember(updatedMember);
      const updated = await getMembersByBatchId(batch.id);
      setMembers(updated);
      setIsEditModalOpen(false);
      setEditingMember(null);
      triggerToast('Datos del miembro actualizados con éxito.');
    } catch (err) {
      console.error('Error saving member edit:', err);
      alert('Error al actualizar la información del miembro.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!batch) return;
    setDeleting(true);
    try {
      await deleteBatch(batch.id);
      navigate('/lotes');
    } catch (err) {
      console.error('Error deleting batch:', err);
      alert('Error al eliminar el lote.');
      setDeleting(false);
    }
  };

  // PDF report group buckets
  const reportBuckets = useMemo(() => {
    if (!batch) return [];
    return resolveBatchReportBuckets(batch, members, { regions, districts, groups });
  }, [batch, members, regions, districts, groups]);

  const eligibleBuckets = useMemo(
    () => filterEligibleReportBuckets(reportBuckets),
    [reportBuckets]
  );

  // Territorial distribution breakdown
  const territorialBreakdown = useMemo(
    () => calculateBatchTerritorialBreakdown(members, batch, { regions, districts, groups }),
    [members, batch, regions, districts, groups]
  );

  // Totals calculations
  const totals: BatchDetailTotals = useMemo(() => {
    return {
      total: members.length,
      young: members.filter((m) => m.member_type === 'young').length,
      adult: members.filter((m) => m.member_type === 'adult').length,
      valid: members.filter((m) => m.status === 'active').length,
      exceptional: members.filter((m) => m.status === 'exceptional').length,
      eligible: members.filter((m) => m.status === 'active' || m.status === 'exceptional').length,
      pending: members.filter((m) => m.status === 'pending').length
    };
  }, [members]);

  // Filter & Search Logic
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const term = searchQuery.toLowerCase().trim();
    return members.filter((m) => {
      const fullName = `${m.first_names} ${m.last_names}`.toLowerCase();
      const code = (m.recognition_code || '').toLowerCase();
      return fullName.includes(term) || m.identity.includes(term) || code.includes(term);
    });
  }, [members, searchQuery]);

  // TanStack Table columns
  const columns = useMemo(
    () =>
      createBatchDetailColumns(
        {
          activeMenuMemberId,
          setActiveMenuMemberId,
          setViewingMember,
          handleEditClick,
          handleDownloadSingleRecognition
        },
        groups,
        batch
      ),
    [activeMenuMemberId, handleEditClick, handleDownloadSingleRecognition, groups, batch]
  );

  const table = useReactTable({
    data: filteredMembers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="flex items-center justify-center min-h-[400px] font-sans text-neutral/75"
      >
        Cargando detalles de lote...
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="max-w-md mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-4 font-sans"
      >
        <AlertCircle className="w-12 h-12 text-red-700 mx-auto" aria-hidden="true" />
        <h2 className="text-xl font-bold text-neutral">Error al cargar el lote</h2>
        <p className="text-xs text-red-700 font-medium">{loadError}</p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate('/lotes')}>
            Volver al listado
          </Button>
          <Button variant="primary" onClick={loadBatchDetails} className="inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div role="alert" className="max-w-md mx-auto text-center space-y-4 py-12 font-sans">
        <AlertCircle className="w-12 h-12 text-red-700 mx-auto" aria-hidden="true" />
        <h2 className="text-xl font-bold text-neutral">Lote no encontrado</h2>
        <Button variant="primary" onClick={() => navigate('/lotes')}>
          Volver al listado
        </Button>
      </div>
    );
  }

  const recognitionTitle = batch.recognition_type
    ? getRecognitionName(batch.recognition_type)
    : 'Servicio Prolongado';

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans py-2 relative">
      {/* Toast Notification */}
      {showToast && <Toast message={toastMessage} variant="success" />}

      {/* Header with Title and Action Buttons */}
      <BatchDetailHeader
        batch={batch}
        startTour={() => startTour()}
        onDeleteClick={() => setIsDeleteModalOpen(true)}
        reportBuckets={reportBuckets}
        eligibleBuckets={eligibleBuckets}
        isListEmpty={members.length === 0}
        onDownloadMemberList={handleDownloadMemberListPDF}
        downloadingReport={downloadingReport}
        onDownloadCertificatesZip={handleDownloadPDF}
        downloadingCertificatesZip={zipDownload.isDownloading}
        isEligibleZero={totals.eligible === 0}
      />

      {/* Top 3 Information Cards */}
      <BatchSummaryCards
        batch={batch}
        totals={totals}
        recognitionTitle={recognitionTitle}
      />

      {/* Card 4: Territorial Distribution */}
      <BatchTerritorialCard breakdown={territorialBreakdown} />

      {/* Members Table Container */}
      <BatchMembersTable
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        table={table}
        columnsCount={columns.length}
        totalMembersCount={filteredMembers.length}
      />

      {/* Manual Member Edit Modal */}
      <EditMemberModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        member={editingMember}
        onSave={handleSaveMemberEdit}
        regions={regions}
        districts={districts}
        groups={groups}
      />

      {/* Member Quick View Details Modal */}
      <MemberQuickViewModal
        member={viewingMember}
        onClose={() => setViewingMember(null)}
        groups={groups}
        batch={batch}
      />

      {/* Modal: Confirmar Eliminación de Lote */}
      <DeleteBatchModal
        isOpen={isDeleteModalOpen}
        batchId={batch.id}
        batchComment={batch.comment}
        deleting={deleting}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* Modal: Progreso de Generación ZIP */}
      <CertificateZipProgressModal
        isOpen={zipDownload.isOpen}
        phase={zipDownload.phase}
        progress={zipDownload.progress}
        isCancelling={zipDownload.isCancelling}
        scopeLabel={zipDownload.scopeLabel}
        onCancel={zipDownload.cancelDownload}
      />

      {/* Walkthrough Interactive Guide Overlay */}
      <WalkthroughOverlay
        isOpen={isTourOpen}
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        targetRect={targetRect}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
        onClose={skipTour}
      />
    </div>
  );
};

export default BatchDetail;
