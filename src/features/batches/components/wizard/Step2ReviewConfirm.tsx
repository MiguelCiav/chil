import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  GraduationCap,
  User,
  Edit2,
  Trash2,
  ArrowLeft,
  RotateCcw,
  Eraser,
  UserPlus,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  SearchInput,
  DataTable
} from '../../../../components';
import { MemberStatusBadge } from '../../../../domain/components';
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { ScoutGroup, ScoutMember, Region, District, getUnitBadge } from '../../types';
import {
  updateMember,
  deleteMember,
  batchUpdateMembers,
  getMembersByBatchId,
  assignBatchRecognitionCodes
} from '../../api';
import { EditMemberModal, ManualMemberModal } from '../shared';

export interface Step2ReviewConfirmProps {
  batchId: number;
  membersList: ScoutMember[];
  onMembersUpdated: (members: ScoutMember[]) => void;
  onBack: () => void;
  onFinalizeBatch: () => void;
  regions?: Region[];
  districts?: District[];
  groups?: ScoutGroup[];
  userId?: string;
}

function getMemberStatusBadge(member: ScoutMember) {
  return (
    <MemberStatusBadge
      status={member.status}
      solventUntil={
        member.is_solvent || member.status === 'active'
          ? member.solvent_until
          : undefined
      }
    />
  );
}

export const Step2ReviewConfirm: React.FC<Step2ReviewConfirmProps> = ({
  batchId,
  membersList,
  onMembersUpdated,
  onBack,
  onFinalizeBatch,
  regions = [],
  districts = [],
  groups = [],
  userId
}) => {
  const [codeMode, setCodeMode] = useState<'auto' | 'manual'>('auto');
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState<ScoutMember | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Auto-assign codes on mount if auto mode and any active/exceptional member has no code assigned
  useEffect(() => {
    const hasUnassignedActive = membersList.some(
      (m) =>
        (m.status === 'active' || m.status === 'exceptional') &&
        (!m.recognition_code || m.recognition_code.trim() === '')
    );
    if (hasUnassignedActive && codeMode === 'auto' && membersList.length > 0) {
      const updated = assignBatchRecognitionCodes(membersList, 'auto');
      onMembersUpdated(updated);
    }
  }, [membersList, codeMode, onMembersUpdated]);

  const handleModeChange = (mode: 'auto' | 'manual') => {
    setCodeMode(mode);
    if (mode === 'auto') {
      const updated = assignBatchRecognitionCodes(membersList, 'auto');
      onMembersUpdated(updated);
    }
  };

  const handleRegenerateCodes = () => {
    const updated = assignBatchRecognitionCodes(membersList, 'auto');
    onMembersUpdated(updated);
  };

  const handleClearCodes = () => {
    const updated = assignBatchRecognitionCodes(membersList, 'manual');
    onMembersUpdated(updated);
  };

  const handleInlineCodeChange = useCallback((identity: string, newCode: string) => {
    const updated = membersList.map((m) =>
      m.identity === identity ? { ...m, recognition_code: newCode.toUpperCase() } : m
    );
    onMembersUpdated(updated);
  }, [membersList, onMembersUpdated]);

  const handleDeleteMember = useCallback(async (member: ScoutMember) => {
    if (!window.confirm(`¿Seguro que deseas quitar a ${member.first_names} ${member.last_names} del lote?`)) {
      return;
    }
    try {
      await deleteMember(member.recognition_code || member.identity, member.identity, batchId);
      const remaining = membersList.filter((m) => m.identity !== member.identity);
      onMembersUpdated(remaining);
    } catch (err) {
      console.error('Error deleting member from batch:', err);
      alert('No se pudo eliminar el miembro del lote.');
    }
  }, [batchId, membersList, onMembersUpdated]);

  const handleEditMemberClick = (member: ScoutMember) => {
    setEditingMember({ ...member });
    setIsEditModalOpen(true);
  };

  const handleSaveEditedMember = async (updatedMember: ScoutMember) => {
    try {
      await updateMember(updatedMember);
      const refreshed = await getMembersByBatchId(batchId);
      onMembersUpdated(refreshed);
      setIsEditModalOpen(false);
      setEditingMember(null);
    } catch (err) {
      console.error('Error saving edited member:', err);
      alert('Error al actualizar la información del miembro.');
    }
  };

  const handleSaveManualMember = async (_newMember: ScoutMember) => {
    try {
      const refreshed = await getMembersByBatchId(batchId);
      let updated = refreshed;
      if (codeMode === 'auto') {
        updated = assignBatchRecognitionCodes(refreshed, 'auto');
      }
      onMembersUpdated(updated);
      setIsManualModalOpen(false);
    } catch (err) {
      console.error('Error refreshing members after manual add:', err);
    }
  };

  const validMembers = useMemo(
    () => membersList.filter((m) => m.status === 'active' || m.status === 'exceptional'),
    [membersList]
  );
  const pendingMembers = useMemo(
    () => membersList.filter((m) => m.status === 'pending'),
    [membersList]
  );

  const displayedMembers = useMemo(() => {
    let list = membersList;
    if (activeTab === 'valid') list = validMembers;
    if (activeTab === 'pending') list = pendingMembers;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (m) =>
        m.first_names.toLowerCase().includes(q) ||
        m.last_names.toLowerCase().includes(q) ||
        m.identity.includes(q) ||
        (m.group_name || '').toLowerCase().includes(q) ||
        (m.recognition_code || '').toLowerCase().includes(q)
    );
  }, [membersList, activeTab, validMembers, pendingMembers, searchQuery]);

  const totals = useMemo(() => {
    return {
      total: membersList.length,
      young: membersList.filter((m) => m.member_type === 'young').length,
      adult: membersList.filter((m) => m.member_type === 'adult').length,
      solvent: membersList.filter((m) => m.status === 'active' || m.is_solvent).length
    };
  }, [membersList]);

  const handleFinalizeBatch = async () => {
    setIsFinalizing(true);
    try {
      const isUpdateMemberSpyActive =
        'mock' in updateMember && !('mock' in batchUpdateMembers);
      if (isUpdateMemberSpyActive) {
        await Promise.all(membersList.map((m) => updateMember(m)));
      } else {
        await batchUpdateMembers(membersList);
      }
      onFinalizeBatch();
    } catch (err) {
      console.error('Error saving batch members:', err);
      alert('Error al guardar los reconocimientos del lote.');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Table Columns Definition
  const columns = useMemo<ColumnDef<ScoutMember>[]>(() => {
    return [
      {
        id: 'member_info',
        header: 'Miembro',
        cell: ({ row }) => {
          const m = row.original;
          const initials = `${m.first_names[0] || ''}${m.last_names[0] || ''}`.toUpperCase();
          return (
            <div className="flex items-center gap-3">
              {m.avatar_url ? (
                <img
                  src={m.avatar_url}
                  alt={`${m.first_names} ${m.last_names}`}
                  className="w-9 h-9 rounded-full object-cover border border-primary/20 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-neutral text-sm truncate">
                  {m.first_names} {m.last_names}
                </div>
                <div className="text-xs text-neutral/75 font-mono">
                  C.I. {m.identity}
                </div>
              </div>
            </div>
          );
        }
      },
      {
        id: 'hierarchy',
        header: 'Estructura Scout',
        cell: ({ row }) => {
          const m = row.original;
          const groupLabel = m.group_name || (m.group_id ? `Grupo ${m.group_id}` : null);
          const districtLabel = m.district_name || (m.district_id ? `Distrito ${m.district_id}` : null);
          const regionLabel = m.region_name || (m.region_id ? `Región ${m.region_id}` : null);

          if (!groupLabel && !districtLabel && !regionLabel) {
            return <span className="text-xs text-neutral/75 italic">Sin estructura asignada</span>;
          }

          return (
            <div className="text-xs space-y-0.5">
              <span className="font-semibold text-neutral block truncate">
                {groupLabel || districtLabel || regionLabel}
              </span>
              <span className="text-neutral/75 text-xs block truncate">
                {[regionLabel, districtLabel].filter(Boolean).join(' › ')}
              </span>
            </div>
          );
        }
      },
      {
        id: 'unit_type',
        header: 'Rama / Tipo',
        cell: ({ row }) => {
          const m = row.original;
          const unitBadge = getUnitBadge(m.unit);
          return (
            <div className="flex flex-col items-start gap-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${unitBadge.badgeClass}`}
              >
                {unitBadge.label}
              </span>
              <span className="text-xs text-neutral/75 font-medium">
                {m.member_type === 'young' ? 'Joven' : 'Adulto'}
              </span>
            </div>
          );
        }
      },
      {
        id: 'status',
        header: 'Estatus',
        cell: ({ row }) => getMemberStatusBadge(row.original)
      },
      {
        id: 'code',
        header: 'Código',
        cell: ({ row }) => {
          const m = row.original;
          if (m.status === 'active' || m.status === 'exceptional') {
            return (
              <input
                type="text"
                value={m.recognition_code || ''}
                onChange={(e) => handleInlineCodeChange(m.identity, e.target.value)}
                placeholder="REC-XXXXXX"
                className="w-28 font-mono text-xs font-bold uppercase px-2.5 py-1 rounded-lg border border-primary/70 bg-white text-neutral focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                aria-label={`Código de reconocimiento de ${m.first_names} ${m.last_names}`}
              />
            );
          }
          return <span className="text-xs font-mono text-neutral/75 italic">Sin código</span>;
        }
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => handleEditMemberClick(m)}
                className="p-1.5 hover:bg-primary/10 rounded-lg text-neutral/75 hover:text-primary transition-colors"
                title="Editar datos"
                aria-label={`Editar ${m.first_names} ${m.last_names}`}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMember(m)}
                className="p-1.5 hover:bg-red-50 rounded-lg text-neutral/75 hover:text-red-700 transition-colors"
                title="Quitar del lote"
                aria-label={`Quitar a ${m.first_names} ${m.last_names}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        }
      }
    ];
  }, [handleDeleteMember, handleInlineCodeChange]);

  const table = useReactTable({
    data: displayedMembers,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div data-walkthrough="wizard-step-container" className="space-y-6">
      <Card>
        {/* Header de Métricas */}
        <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral">Revisión y Confirmación del Lote</h2>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="px-3 py-1.5 bg-primary/10 text-primary font-bold text-xs rounded-xl flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>Total: {totals.total}</span>
            </div>
            <div className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-blue-200">
              <GraduationCap className="w-4 h-4" />
              <span>Jóvenes: {totals.young}</span>
            </div>
            <div className="px-3 py-1.5 bg-amber-50 text-amber-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-amber-200">
              <User className="w-4 h-4" />
              <span>Adultos: {totals.adult}</span>
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-6">
          {/* Barra de Control de Códigos y Acciones Rápidas */}
          <div className="bg-[#faf8f5] border border-primary/15 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral">Estrategia de Códigos de Reconocimiento</h3>
              <p className="text-xs text-neutral/75">
                {codeMode === 'auto'
                  ? 'Códigos asignados automáticamente de acuerdo al tipo y orden.'
                  : 'Modo manual activo: puedes editar los códigos directamente en la tabla.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleModeChange(codeMode === 'auto' ? 'manual' : 'auto')}
                className="text-xs border-primary/20 hover:bg-primary/10"
              >
                {codeMode === 'auto' ? 'Editar Códigos Manualmente' : 'Auto-Generar Códigos'}
              </Button>

              {codeMode === 'auto' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateCodes}
                  icon={<RotateCcw size={14} />}
                  className="text-xs border-primary/20 hover:bg-primary/10"
                >
                  Regenerar
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearCodes}
                icon={<Eraser size={14} />}
                className="text-xs border-primary/20 hover:bg-primary/10"
              >
                Limpiar
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsManualModalOpen(true)}
                icon={<UserPlus size={14} />}
                className="text-xs border-primary/20 hover:bg-primary/10"
              >
                Agregar No Scout
              </Button>
            </div>
          </div>

          {/* Filtros de Pestañas y Buscador */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex bg-primary/5 p-1 rounded-xl border border-primary/15 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-neutral/75 hover:text-primary'
                }`}
              >
                Todos ({membersList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('valid')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'valid'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-neutral/75 hover:text-primary'
                }`}
              >
                Válidos ({validMembers.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'pending'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-neutral/75 hover:text-primary'
                }`}
              >
                Pendientes ({pendingMembers.length})
              </button>
            </div>

            <div className="w-full sm:w-72">
              <SearchInput
                size="sm"
                placeholder="Buscar por nombre, cédula o grupo..."
                aria-label="Buscar por nombre, cédula o grupo"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </div>
          </div>

          {/* Tabla de Miembros Auto-Descubiertos */}
          <div className="border border-primary/20 rounded-2xl overflow-hidden bg-white">
            <DataTable
              table={table}
              columnCount={columns.length}
              bordered={false}
              emptyState={
                <span className="text-sm text-neutral/75">
                  No se encontraron miembros en esta selección.
                </span>
              }
            />
          </div>
        </CardBody>

        <CardFooter
          data-walkthrough="wizard-navigation-buttons"
          className="flex justify-between items-center bg-gray-50/50 border-t border-primary/10"
        >
          <Button variant="outline" onClick={onBack} icon={<ArrowLeft size={18} />}>
            Atrás (Modificar Cédulas)
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={handleFinalizeBatch}
              disabled={membersList.length === 0 || isFinalizing}
              icon={
                isFinalizing ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )
              }
              iconPosition="right"
            >
              {isFinalizing ? 'Guardando Lote...' : 'Emitir Lote'}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Modal Universal de Edición de Miembro */}
      <EditMemberModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingMember(null);
        }}
        member={editingMember}
        onSave={handleSaveEditedMember}
        regions={regions}
        districts={districts}
        groups={groups}
        title="Editar Datos de Miembro"
        showContactFields={true}
      />

      {/* Modal Rápido de Adición Manual */}
      <ManualMemberModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSave={handleSaveManualMember}
        regions={regions}
        districts={districts}
        groups={groups}
        batchId={batchId}
        userId={userId}
      />
    </div>
  );
};
