import React, { useState, useEffect, useMemo } from 'react';
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

import { Card, CardBody } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Table } from '../../../components/Table';
import { ColumnDef } from '@tanstack/react-table';

import { getBatchById, getMembersByBatchId, getHierarchyData, generateBatchReport } from '../api';
import { Batch, ScoutMember } from '../types';
import {
  generateBatchCertificatesPdf,
  getRecognitionTypeById,
  RecognitionType
} from '../../recognitions';

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
  <Card className="shadow-sm hover:scale-[1.02] transition-transform">
    <CardBody className="flex items-center gap-4">
      <div className={`w-12 h-12 ${iconBgClass} rounded-2xl flex items-center justify-center ${iconColorClass}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black text-neutral">{value}</div>
        <div className="text-xs text-neutral/50 font-bold uppercase tracking-wider">{title}</div>
      </div>
    </CardBody>
  </Card>
);

async function loadFallbackBatch(): Promise<{ batch: Batch | null; members: ScoutMember[] }> {
  let batches: Batch[] = [];
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      batches = JSON.parse(localStorage.getItem('chil_batches') || '[]');
    }
  } catch {
    batches = [];
  }

  if (batches.length > 0) {
    const lastBatch = batches.at(-1)!;
    const lastBatchMembers = await getMembersByBatchId(lastBatch.id);
    return { batch: lastBatch, members: lastBatchMembers };
  }
  return { batch: null, members: [] };
}

function renderSuccessIdentityCell(info: { getValue: () => unknown }) {
  return <span className="font-mono text-xs sm:text-sm text-neutral/80">{info.getValue() as string}</span>;
}

function renderSuccessNameCell(info: { row: { original: ScoutMember } }) {
  const rowData = info.row.original;
  return <span className="font-bold text-neutral">{rowData.first_names} {rowData.last_names}</span>;
}

function renderSuccessTypeCell(info: { getValue: () => unknown }) {
  const val = info.getValue() as 'young' | 'adult';
  return (
    <span className="text-neutral/70 font-medium text-sm">
      {val === 'young' ? 'Joven' : 'Adulto'}
    </span>
  );
}

function renderSuccessStatusCell(info: { getValue: () => unknown }) {
  const val = info.getValue() as 'active' | 'pending' | 'exceptional';
  if (val === 'active') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f7eb] text-[#1b7a37] border border-[#c3eed0]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#1b7a37] mr-1.5 inline-block" />Registro Válido
      </span>
    );
  }
  if (val === 'exceptional') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#f3e8ff] text-[#7e22ce] border border-[#e9d5ff]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7e22ce] mr-1.5 inline-block" />Emisión Excepcional
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#feeae8] text-[#c92a2a] border border-[#fccfca]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#c92a2a] mr-1.5 inline-block" />Registro Inválido
    </span>
  );
}

function renderSuccessCodeCell(info: { row: { original: ScoutMember } }) {
  const rowData = info.row.original;
  const code = rowData.recognition_code || '-';
  return (
    <span className="font-mono text-xs sm:text-sm font-semibold text-primary">
      {code}
    </span>
  );
}

function renderSuccessActionsCell(onNavigateToBatch: () => void) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onNavigateToBatch}
        className="p-1.5 border border-gray-200 hover:border-primary text-neutral hover:text-primary rounded-lg transition-all"
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
      cell: renderSuccessIdentityCell
    },
    {
      accessorKey: 'name',
      header: 'NOMBRE COMPLETO',
      cell: renderSuccessNameCell
    },
    {
      accessorKey: 'member_type',
      header: 'TIPO',
      cell: renderSuccessTypeCell
    },
    {
      accessorKey: 'status',
      header: 'ESTATUS',
      cell: renderSuccessStatusCell
    },
    {
      accessorKey: 'recognition_code',
      header: 'CÓDIGO REC.',
      cell: renderSuccessCodeCell
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
  const [downloading, setDownloading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Columns for Resumen del Lote
  const columns = useMemo(
    () => createSuccessColumns(() => navigate(`/lotes/${batch?.id}`)),
    [navigate, batch?.id]
  );

  useEffect(() => {
    const loadBatchData = async () => {
      if (!batchId) {
        const fallback = await loadFallbackBatch();
        setBatch(fallback.batch);
        setMembers(fallback.members);
        setLoading(false);
        return;
      }

      try {
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

  const handleDownloadPDF = async () => {
    if (!batch) return;
    setDownloading(true);
    try {
      let recType: RecognitionType | null = null;
      if (batch.recognition_type) {
        recType = await getRecognitionTypeById(batch.recognition_type);
      }
      const hierarchy = await getHierarchyData();
      const path = await generateBatchCertificatesPdf({
        batch,
        members,
        recognition: recType,
        hierarchy
      });
      setToastMessage(`¡Reconocimientos descargados exitosamente en ${path}!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error(err);
      alert("Error al generar los reconocimientos en PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!batch) return;
    setDownloadingReport(true);
    try {
      const hierarchy = await getHierarchyData();
      await generateBatchReport(batch, members, hierarchy);
      setToastMessage('¡Lista de miembros (PDF) descargada exitosamente!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error('Error generating member list PDF:', err);
      alert('Error al generar la lista de miembros en PDF.');
    } finally {
      setDownloadingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] font-sans text-neutral/50">
        Cargando resultados...
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-12 font-sans">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-neutral">No se encontró información del lote</h2>
        <Button variant="primary" onClick={() => navigate('/lotes')}>
          Volver a la lista
        </Button>
      </div>
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
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-neutral text-white px-5 py-3 rounded-2xl shadow-xl animate-fade-in border border-primary/20">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Success Hero Header */}
      <div className="text-center space-y-4 py-6 bg-white border border-primary/20 rounded-3xl p-8 shadow-sm">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight">¡Lote Generado Exitosamente!</h1>
          <p className="text-xs sm:text-sm text-neutral/70 mt-1">
            {'El lote '}
            <span className="text-primary font-bold">#{batch?.id}</span>
            {' está listo para ser procesado.'}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-3">
          <Button
            variant="primary"
            onClick={handleDownloadPDF}
            disabled={downloading || eligibleCount === 0}
            title={eligibleCount === 0 ? "No hay miembros habilitados (activos o con emisión excepcional) en este lote para generar reconocimientos" : undefined}
            icon={<Download size={18} />}
          >
            {downloading ? 'Generando PDF...' : 'Descargar Reconocimientos'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadReport}
            disabled={downloadingReport || members.length === 0}
            title={members.length === 0 ? "No hay miembros en este lote para generar la lista" : undefined}
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
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 shadow-sm">
          <div className="flex gap-3 items-center">
            <div className="p-2 bg-red-100 rounded-2xl text-red-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-red-800">Hay registros no válidos o pendientes</div>
              <p className="text-xs text-red-600 font-medium">Hay {totals.pending} miembros que no están inscritos en el sistema nacional de scouts.</p>
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
      <div className="w-full border border-primary/20 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="p-4 sm:p-5 border-b border-primary/20 bg-primary/5 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-neutral">Resumen del Lote</h2>
        </div>
        <Table columns={columns} data={members} className="border-0 rounded-none shadow-none" />
      </div>

    </div>
  );
};
export default SuccessPage;
