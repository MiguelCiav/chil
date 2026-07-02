import React, { useState, useEffect } from 'react';
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

import { Card, CardHeader, CardBody } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Table } from '../../../components/Table';
import { ColumnDef } from '@tanstack/react-table';

import { getBatchById, getMembersByBatchId, generateBatchReport } from '../api';
import { Batch, ScoutMember } from '../types';

export const SuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { batchId?: number; name?: string } | null;
  const batchId = state?.batchId;

  const [batch, setBatch] = useState<Batch | null>(null);
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const loadBatchData = async () => {
      if (!batchId) {
        // Fallback: try to read the last created batch from localStorage
        const batches = JSON.parse(localStorage.getItem('chil_batches') || '[]');
        if (batches.length > 0) {
          const lastBatch = batches[batches.length - 1];
          const lastBatchMembers = await getMembersByBatchId(lastBatch.id);
          setBatch(lastBatch);
          setMembers(lastBatchMembers);
        }
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
      const path = await generateBatchReport(batch.id);
      setToastMessage(`¡Reporte descargado exitosamente en ${path}!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error(err);
      alert("Error al generar el reporte PDF.");
    } finally {
      setDownloading(false);
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

  // Helper to generate the SCT code
  const getSCTCode = (member: ScoutMember) => {
    if (member.status === 'pending') return 'SCT-PENDIENTE';
    const suffix = member.identity.slice(-4).padStart(4, '0');
    return `SCT-2026-${suffix}`;
  };

  // Columns for Resumen del Lote
  const columns: ColumnDef<ScoutMember>[] = [
    {
      accessorKey: 'identity',
      header: 'Código SCT',
      cell: (info) => {
        const rowData = info.row.original;
        const code = getSCTCode(rowData);
        return (
          <span className={`font-semibold ${rowData.status === 'pending' ? 'text-red-500' : 'text-primary'}`}>
            {code}
          </span>
        );
      }
    },
    {
      accessorKey: 'name',
      header: 'Nombre Completo',
      cell: (info) => {
        const rowData = info.row.original;
        return (
          <span className="font-semibold text-neutral">{rowData.first_names} {rowData.last_names}</span>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Estatus',
      cell: (info) => {
        const val = info.getValue() as 'active' | 'pending';
        return val === 'active' ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
            Registro válido
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            No registrado
          </span>
        );
      }
    },
    {
      accessorKey: 'member_type',
      header: 'Tipo',
      cell: (info) => {
        const val = info.getValue() as 'young' | 'adult';
        return (
          <span className="text-neutral/70 font-medium">{val === 'young' ? 'Joven' : 'Adulto'}</span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: () => {
        return (
          <div className="flex gap-2">
            <button 
              onClick={() => navigate(`/lotes/${batch.id}`)}
              className="p-1.5 border border-gray-200 hover:border-primary text-neutral hover:text-primary rounded-lg transition-all"
              title="Vista previa"
            >
              <Eye size={15} />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans relative">
      
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
          <h1 className="text-3xl font-extrabold text-neutral tracking-tight">¡Lote Generado Exitosamente!</h1>
          <p className="text-neutral/50 font-medium mt-1">El lote <span className="text-primary font-bold">#{batch?.id}</span> está listo para ser procesado.</p>
        </div>
        <div className="flex justify-center gap-3 pt-3">
          <Button
            variant="primary"
            onClick={handleDownloadPDF}
            disabled={downloading || members.filter(m => m.status === 'active').length === 0}
            title={members.filter(m => m.status === 'active').length === 0 ? "No hay miembros activos en este lote para generar un reporte" : undefined}
            icon={<Download size={18} />}
          >
            {downloading ? 'Generando PDF...' : 'Descargar PDF del Reporte'}
          </Button>
          <Link to="/lotes/nuevo">
            <Button variant="outline" icon={<ArrowLeft size={18} />}>
              Crear nuevo lote
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="shadow-sm hover:scale-[1.02] transition-transform">
          <CardBody className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-neutral">{totals.total}</div>
              <div className="text-xs text-neutral/50 font-bold uppercase tracking-wider">Miembros Totales</div>
            </div>
          </CardBody>
        </Card>
        
        <Card className="shadow-sm hover:scale-[1.02] transition-transform">
          <CardBody className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-neutral">{totals.young}</div>
              <div className="text-xs text-neutral/50 font-bold uppercase tracking-wider">Jóvenes Registrados</div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm hover:scale-[1.02] transition-transform">
          <CardBody className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-neutral">{totals.adult}</div>
              <div className="text-xs text-neutral/50 font-bold uppercase tracking-wider">Adultos Registrados</div>
            </div>
          </CardBody>
        </Card>
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
            onClick={() => navigate(`/lotes/${batch.id}`)}
            className="flex items-center text-sm font-bold text-red-700 hover:text-red-900 transition-colors"
          >
            Ver detalles
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {/* Resumen del Lote Table */}
      <Card className="shadow-lg border-primary/10">
        <CardHeader className="bg-primary/5 border-b border-primary/10 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Resumen del Lote
        </CardHeader>
        <CardBody className="p-0">
          <Table columns={columns} data={members} className="border-0 rounded-none shadow-none" />
        </CardBody>
      </Card>

    </div>
  );
};
export default SuccessPage;
