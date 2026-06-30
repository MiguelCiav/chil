import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Search, 
  Users, 
  GraduationCap, 
  User, 
  AlertCircle, 
  Calendar,
  MapPin,
  CheckCircle,
  Edit2,
  CheckCircle2
} from 'lucide-react';

import { Card, CardHeader, CardBody } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Table } from '../../../components/Table';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/Modal';
import { Field } from '../../../components/Field';
import { ColumnDef } from '@tanstack/react-table';

import { 
  getBatchById, 
  getMembersByBatchId, 
  updateMember, 
  generateBatchReport, 
  getHierarchyData 
} from '../api';
import { Batch, ScoutMember, Region, District, ScoutGroup } from '../types';

export const BatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const batchId = Number(id);

  const [batch, setBatch] = useState<Batch | null>(null);
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [loading, setLoading] = useState(!isNaN(Number(id)));
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'pending'>('all');
  const [downloading, setDownloading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Editing Member
  const [editingMember, setEditingMember] = useState<ScoutMember | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Hierarchy cache
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);

  useEffect(() => {
    if (isNaN(batchId)) {
      return;
    }

    Promise.all([
      getBatchById(batchId),
      getMembersByBatchId(batchId),
      getHierarchyData()
    ])
      .then(([b, m, hierarchy]) => {
        setBatch(b);
        setMembers(m);
        setRegions(hierarchy.regions);
        setDistricts(hierarchy.districts);
        setGroups(hierarchy.groups);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [batchId]);

  const handleDownloadPDF = async () => {
    if (!batch) return;
    setDownloading(true);
    try {
      const path = await generateBatchReport(batch.id);
      setToastMessage(`¡Reporte PDF descargado exitosamente en ${path}!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error(err);
      alert("Error al generar el reporte PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handleEditClick = (member: ScoutMember) => {
    setEditingMember(member);
    setIsEditModalOpen(true);
  };

  const handleSaveMemberEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMember || !batch) return;

    try {
      await updateMember(editingMember);
      const updated = await getMembersByBatchId(batch.id);
      setMembers(updated);
      setIsEditModalOpen(false);
      setEditingMember(null);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la información del miembro.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] font-sans text-neutral/50">
        Cargando detalles de lote...
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-12 font-sans">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-neutral">Lote no encontrado</h2>
        <Button variant="primary" onClick={() => navigate('/lotes')}>
          Volver al listado
        </Button>
      </div>
    );
  }

  const getRegionName = (id: number) => regions.find(r => r.id === id)?.name || `Región ${id}`;
  const getDistrictName = (id: number) => districts.find(d => d.id === id)?.name || `Distrito ${id}`;
  const getGroupName = (id: number) => groups.find(g => g.id === id)?.name || `Grupo ${id}`;

  // Stats
  const totals = {
    total: members.length,
    young: members.filter(m => m.member_type === 'young').length,
    adult: members.filter(m => m.member_type === 'adult').length,
    valid: members.filter(m => m.status === 'active').length,
    pending: members.filter(m => m.status === 'pending').length
  };

  // Filter & Search Logic
  const filteredMembers = members.filter(m => {
    // Tab Filter
    if (activeTab === 'valid' && m.status !== 'active') return false;
    if (activeTab === 'pending' && m.status !== 'pending') return false;

    // Search Query Filter
    const term = searchQuery.toLowerCase();
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    return fullName.includes(term) || m.identity.includes(term);
  });

  const columns: ColumnDef<ScoutMember>[] = [
    {
      accessorKey: 'identity',
      header: 'Cédula',
      cell: (info) => (
        <span className="font-semibold text-neutral">{info.getValue() as string}</span>
      )
    },
    {
      accessorKey: 'name',
      header: 'Nombre Completo',
      cell: (info) => {
        const rowData = info.row.original;
        return (
          <span className="font-semibold text-neutral">{rowData.first_name} {rowData.last_name}</span>
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
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Registro válido
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
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
          <span className="text-neutral/60 font-semibold">{val === 'young' ? 'Joven' : 'Adulto'}</span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: (info) => {
        const rowData = info.row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditClick(rowData)}
            icon={<Edit2 size={13} />}
          >
            Editar
          </Button>
        );
      }
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans relative">
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-neutral text-white px-5 py-3 rounded-2xl shadow-xl border border-primary/20 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Link to="/lotes" className="inline-flex items-center text-sm font-bold text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver al listado
          </Link>
          <h1 className="text-3xl font-extrabold text-neutral tracking-tight">
            Lote #{batch.id} {batch.comment ? `(${batch.comment})` : ''}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-neutral/50">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {getRegionName(batch.region_id)} • {getDistrictName(batch.district_id)} • {getGroupName(batch.group_id)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-neutral/40" />
              {new Date(batch.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleDownloadPDF}
          disabled={downloading || totals.valid === 0}
          title={totals.valid === 0 ? "No hay miembros activos en este lote para generar un reporte" : undefined}
          icon={<Download size={18} />}
        >
          {downloading ? 'Generando PDF...' : 'Exportar PDF'}
        </Button>
      </div>

      {/* Dashboard KPI statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="shadow-sm">
          <CardBody className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-neutral">{totals.total}</div>
              <div className="text-[10px] text-neutral/50 font-bold uppercase tracking-wider">Miembros</div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardBody className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-neutral">{totals.young}</div>
              <div className="text-[10px] text-neutral/50 font-bold uppercase tracking-wider">Jóvenes</div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardBody className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-neutral">{totals.adult}</div>
              <div className="text-[10px] text-neutral/50 font-bold uppercase tracking-wider">Adultos</div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm border-red-100">
          <CardBody className="p-5 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${totals.pending > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-green-50 text-green-600'}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-neutral">{totals.pending}</div>
              <div className="text-[10px] text-neutral/50 font-bold uppercase tracking-wider">Pendientes</div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Members Grid with filters */}
      <Card className="shadow-lg border-primary/10">
        <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Tab Filters */}
          <div className="flex bg-primary/5 p-1 rounded-xl border border-primary/15 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'all' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-neutral/60 hover:text-primary'
              }`}
            >
              Todos
              <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-neutral/10 text-neutral/70 rounded-full">
                {totals.total}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('valid')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'valid' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-neutral/60 hover:text-primary'
              }`}
            >
              Válidos
              <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-green-50 text-green-600 rounded-full">
                {totals.valid}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'pending' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-neutral/60 hover:text-primary'
              }`}
            >
              Pendientes
              <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-red-50 text-red-600 rounded-full">
                {totals.pending}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral/40 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-primary/20 bg-primary/5 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <Table columns={columns} data={filteredMembers} className="border-0 rounded-none shadow-none" />
        </CardBody>
      </Card>

      {/* Manual Member Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-xl">
        <ModalHeader onClose={() => setIsEditModalOpen(false)}>Editar Datos de Miembro</ModalHeader>
        {editingMember && (
          <form onSubmit={handleSaveMemberEdit}>
            <ModalBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Primer Nombre *"
                  value={editingMember.first_name}
                  onChange={e => setEditingMember({ ...editingMember, first_name: e.target.value })}
                  required
                />
                <Field
                  label="Primer Apellido *"
                  value={editingMember.last_name}
                  onChange={e => setEditingMember({ ...editingMember, last_name: e.target.value })}
                  required
                />
              </div>
              <Field
                label="Fecha de Nacimiento *"
                type="date"
                value={editingMember.birth_date}
                onChange={e => setEditingMember({ ...editingMember, birth_date: e.target.value })}
                required
              />
              <Field
                label="Correo Electrónico"
                type="email"
                value={editingMember.email || ''}
                onChange={e => setEditingMember({ ...editingMember, email: e.target.value })}
              />
              <Field
                label="Teléfono de Contacto"
                value={editingMember.phone || ''}
                onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })}
              />
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Guardar Cambios
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

    </div>
  );
};
export default BatchDetail;
