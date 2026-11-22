import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Download,
  FileText,
  ArrowLeft,
  Users,
  GraduationCap,
  User,
  AlertCircle,
  ChevronRight,
  Eye
} from 'lucide-react';
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';

import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Toast,
  DataTable,
  ErrorAlert
} from '../../../components';
import {
  getAllBatches,
  getBatchById,
  getMembersByBatchId,
  getHierarchyData,
  generateBatchReport
} from '../api';
import { Batch, ScoutMember } from '../types';
import {
  generateBatchCertificatesZip,
  getRecognitionTypeById,
  RecognitionType
} from '../../recognitions';
import {
  CertificateZipProgressModal,
  renderMemberIdentityCell,
  renderMemberNameCell,
  renderMemberTypeCell,
  renderMemberStatusCell,
  renderMemberCodeCell
} from './shared';
import { useCertificateZipDownload } from '../hooks/useCertificateZipDownload';

interface StatSummaryCardProps {
  readonly title: string;
  readonly value: number;
  readonly icon: React.ReactNode;
  readonly iconBgClass: string;
  readonly iconColorClass: string;
}

const StatSummaryCard: React.FC<StatSummaryCardProps> = ({
  title,
  value,
  icon,
  iconBgClass,
  iconColorClass
}) => (
  <Card className="hover:scale-[1.02] transition-transform">
    <CardBody className="flex items-center gap-4">
      <div className={`w-12 h-12 ${iconBgClass} rounded-2xl flex items-center justify-center ${iconColorClass}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black text-neutral">{value}</div>
        <div className="text-xs text-neutral/75 font-bold uppercase tracking-wider">{title}</div>
      </div>
    </CardBody>
  </Card>
);

function renderSuccessActionsCell(onNavigateToBatch: () => void): React.ReactNode {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onNavigateToBatch}
        className="p-1.5 border border-primary/20 hover:border-primary text-neutral hover:text-primary rounded-lg transition-all"
        title="Vista previa"
      >
        <Eye size={15} />
      </button>
    </div>
  );
}

function createSuccessColumns(onNavigateToBatch: () => void): ColumnDef<ScoutMember>[] {
  return [
    {
      accessorKey: 'identity',
      header: 'CÉDULA',
      cell: renderMemberIdentityCell
    },
    {
      accessorKey: 'name',
      header: 'NOMBRE COMPLETO',
      cell: renderMemberNameCell
    },
    {
      accessorKey: 'member_type',
      header: 'TIPO',
      cell: renderMemberTypeCell
    },
    {
      accessorKey: 'status',
      header: 'ESTATUS',
      cell: renderMemberStatusCell
    },
    {
      accessorKey: 'recognition_code',
      header: 'CÓDIGO REC.',
      cell: renderMemberCodeCell
    },
    {
      id: 'actions',
      header: 'ACCIONES',
      cell: () => renderSuccessActionsCell(onNavigateToBatch)
    }
  ];
}

export const SuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { batchId?: number; name?: string } | null;
  const batchId = state?.batchId;

  const [batch, setBatch] = useState<Batch | null>(null);
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [loading, setLoading] = useState(true);
  const zipDownload = useCertificateZipDownload();
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const triggerToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    setShowToast(true);
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  // Columns for Resumen del Lote
  const columns = useMemo(
    () => createSuccessColumns(() => navigate(`/lotes/${batch?.id}`)),
    [navigate, batch?.id]
  );

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  useEffect(() => {
    const loadBatchData = async () => {
      try {
        if (!batchId) {
          const allBatches = typeof getAllBatches === 'function' ? await getAllBatches() : [];
          const latestBatch = allBatches[0] ?? null;
          if (latestBatch) {
            const latestMembers = await getMembersByBatchId(latestBatch.id);
            setBatch(latestBatch);
            setMembers(latestMembers);
          } else {
            setBatch(null);
            setMembers([]);
          }
          return;
        }

        const [b, m] = await Promise.all([
          getBatchById(batchId),
          getMembersByBatchId(batchId)
        ]);
        setBatch(b);
        setMembers(m);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadBatchData();
  }, [batchId]);

  const handleDownloadPDF = () => {
    if (!batch) return;
    void zipDownload.startDownload(
      async ({ onProgress, signal }) => {
        let recType: RecognitionType | null = null;
        if (batch.recognition_type) {
          recType = await getRecognitionTypeById(batch.recognition_type);
          if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
        }
        const hierarchy = await getHierarchyData();
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        return await generateBatchCertificatesZip({
          batch,
          members,
          recognition: recType,
          hierarchy,
          onProgress,
          signal
        });
      },
      {
        scopeLabel: `Lote #${batch.id}`,
        initialTotal: 0,
        onSuccess: (path) => {
          triggerToast(`¡Reconocimientos descargados exitosamente en ${path}!`);
        },
        onError: (err) => {
          console.error(err);
          alert('Error al generar los reconocimientos en ZIP.');
        }
      }
    );
  };

  const handleDownloadReport = async () => {
    if (!batch) return;
    setDownloadingReport(true);
    try {
      const hierarchy = await getHierarchyData();
      await generateBatchReport(batch, members, hierarchy);
      triggerToast('¡Lista de miembros (PDF) descargada exitosamente!');
    } catch (err) {
      console.error('Error generating member list PDF:', err);
      alert('Error al generar la lista de miembros en PDF.');
    } finally {
      setDownloadingReport(false);
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        className="flex items-center justify-center min-h-[400px] font-sans text-neutral/75"
      >
        Cargando resultados...
      </div>
    );
  }

  if (!batch) {
    return (
      <ErrorAlert
        variant="centered"
        title="No se encontró información del lote"
        message="El lote solicitado no está disponible o fue eliminado."
        retryLabel="Volver a la lista"
        onRetry={() => navigate('/lotes')}
      />
    );
  }

  // Stats Calculations
  const totals = {
    total: members.length,
    young: members.filter(m => m.member_type === 'young').length,
    adult: members.filter(m => m.member_type === 'adult').length,
    pending: members.filter(m => m.status === 'pending').length
  };

  const eligibleCount = members.filter(m => m.status === 'active' || m.status === 'exceptional').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans relative py-2">
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          variant="success"
          onDismiss={() => setShowToast(false)}
        />
      )}

      {/* Success Hero Header */}
      <div className="text-center space-y-4 py-6 bg-white border border-primary/20 rounded-3xl p-8">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight">¡Lote Generado Exitosamente!</h1>
          <p className="text-xs sm:text-sm text-neutral/75 mt-1">
            {'El lote '}
            <span className="text-primary font-bold">#{batch?.id}</span>
            {' está listo para ser procesado.'}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-3">
          <Button
            variant="primary"
            onClick={handleDownloadPDF}
            disabled={zipDownload.isDownloading || eligibleCount === 0}
            title={eligibleCount === 0 ? 'No hay miembros habilitados (activos o con emisión excepcional) en este lote para generar reconocimientos' : undefined}
            icon={<Download size={18} />}
          >
            {zipDownload.isDownloading ? 'Generando ZIP...' : 'Descargar Reconocimientos (ZIP)'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadReport}
            disabled={downloadingReport || members.length === 0}
            title={members.length === 0 ? 'No hay miembros en este lote para generar la lista' : undefined}
            icon={<FileText size={18} />}
          >
            {downloadingReport ? 'Generando Lista...' : 'Descargar Lista'}
          </Button>
          <Link to="/lotes/nuevo">
            <Button variant="outline" icon={<ArrowLeft size={18} />}>
              Crear nuevo lote
            </Button>
          </Link>
          <Link to="/lotes">
            <Button variant="outline">
              Volver a la lista
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatSummaryCard
          title="Miembros Totales"
          value={totals.total}
          icon={<Users className="w-6 h-6" />}
          iconBgClass="bg-primary/10"
          iconColorClass="text-primary"
        />

        <StatSummaryCard
          title="Jóvenes Registrados"
          value={totals.young}
          icon={<GraduationCap className="w-6 h-6" />}
          iconBgClass="bg-blue-50"
          iconColorClass="text-blue-600"
        />

        <StatSummaryCard
          title="Adultos Registrados"
          value={totals.adult}
          icon={<User className="w-6 h-6" />}
          iconBgClass="bg-amber-50"
          iconColorClass="text-amber-600"
        />
      </div>

      {/* Alert Banner for Unregistered/Pending members */}
      {totals.pending > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div className="flex gap-3 items-center">
            <div className="p-2 bg-red-100 rounded-2xl text-red-700">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-red-800">Hay registros no válidos o pendientes</div>
              <p className="text-xs text-red-700 font-medium">Hay {totals.pending} miembros que no están inscritos en el sistema nacional de scouts.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/lotes/${batch.id}`)}
            className="flex items-center text-sm font-bold text-red-700 hover:text-red-900 transition-colors"
          >
            Ver detalles
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {/* Resumen del Lote Table */}
      <Card>
        <CardHeader className="p-4 sm:p-5 bg-primary/5 flex items-center justify-start gap-2">
          <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold text-neutral">Resumen del Lote</h2>
        </CardHeader>
        <DataTable
          table={table}
          columnCount={columns.length}
          bordered={false}
        />
      </Card>

      <CertificateZipProgressModal
        isOpen={zipDownload.isOpen}
        phase={zipDownload.phase}
        progress={zipDownload.progress}
        isCancelling={zipDownload.isCancelling}
        scopeLabel={zipDownload.scopeLabel}
        onCancel={zipDownload.cancelDownload}
      />
    </div>
  );
};

export default SuccessPage;
