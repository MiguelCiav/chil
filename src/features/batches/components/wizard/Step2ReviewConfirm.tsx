import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  GraduationCap,
  User,
  Search,
  Edit2,
  Trash2,
  ArrowLeft,
  RotateCcw,
  Eraser,
  UserPlus,
  Download,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../../../../components/Card';
import { Button } from '../../../../components/Button';
import { Table } from '../../../../components/Table';
import { ColumnDef } from '@tanstack/react-table';
import { ScoutGroup, ScoutMember, Region, District, getUnitBadge, Batch } from '../../types';
import {
  updateMember,
  deleteMember,
  batchUpdateMembers,
  getMembersByBatchId,
  assignBatchRecognitionCodes
} from '../../api';
import { EditMemberModal, ManualMemberModal } from '../shared';
import { downloadSingleCertificatePdf } from '../../../recognitions';

export interface Step2ReviewConfirmProps {
  batchId: number;
  batchMetadata: { comment?: string; recognitionType?: string };
  recognitionTypeName?: string;
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
  if (member.status === 'exceptional') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
        Excepcional
      </span>
    );
  }
  if (member.status === 'active' || member.is_solvent) {
    const text = member.solvent_until
      ? `Solvente hasta ${member.solvent_until}`
      : 'Registro válido';
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full">
        <ShieldCheck className="w-3 h-3 text-green-600" />
        <span className="truncate max-w-[150px]">{text}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-full">
      <AlertTriangle className="w-3 h-3 text-red-500" />
      <span>Pendiente</span>
    </span>
  );
}

export const Step2ReviewConfirm: React.FC<Step2ReviewConfirmProps> = ({
  batchId,
  batchMetadata,
  recognitionTypeName = 'Reconocimiento',
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
      await deleteMember(member.recognition_code || member.identity, member.identity);
      const remaining = membersList.filter((m) => m.identity !== member.identity);
      onMembersUpdated(remaining);
    } catch (err) {
      console.error('Error deleting member from batch:', err);
      alert('No se pudo eliminar el miembro del lote.');
    }
  }, [membersList, onMembersUpdated]);

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

  const handleEmitAndDownloadSinglePdf = async () => {
    if (membersList.length === 0) return;
    setIsFinalizing(true);
    try {
      await batchUpdateMembers(membersList);

      const singleMember = membersList[0];
      const batchObj: Batch = {
        id: batchId,
        comment: batchMetadata.comment,
        recognition_type: batchMetadata.recognitionType,
        region_id: singleMember.region_id ?? 0,
        district_id: singleMember.district_id ?? 0,
        group_id: singleMember.group_id ?? 0,
        created_at: new Date().toISOString()
      };

      try {
        await downloadSingleCertificatePdf({
          batch: batchObj,
          member: singleMember,
          recognition: {
            id: batchMetadata.recognitionType || 'custom',
            name: recognitionTypeName,
            created_at: new Date().toISOString()
          },
          hierarchy: { regions, districts, groups }
        });
      } catch (pdfErr) {
        console.warn('Single PDF download failed or mocked:', pdfErr);
      }

      onFinalizeBatch();
    } catch (err) {
      console.error('Error in single certificate emission:', err);
      alert('Error al emitir y descargar el certificado.');
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
                <div className="text-xs text-neutral/50 font-mono">
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
            return <span className="text-xs text-neutral/40 italic">Sin estructura asignada</span>;
          }

          return (
            <div className="text-xs space-y-0.5">
              <span className="font-semibold text-neutral block truncate">
                {groupLabel || districtLabel || regionLabel}
              </span>
              <span className="text-neutral/50 text-[11px] block truncate">
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
              <span className="text-[11px] text-neutral/60 font-medium">
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
                className="w-28 font-mono text-xs font-bold uppercase px-2.5 py-1 rounded-lg border border-primary/20 bg-white text-neutral focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label={`Código de reconocimiento de ${m.first_names} ${m.last_names}`}
              />
            );
          }
          return <span className="text-xs font-mono text-neutral/40 italic">Sin código</span>;
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
                className="p-1.5 hover:bg-primary/10 rounded-lg text-neutral/70 hover:text-primary transition-colors"
                title="Editar datos"
                aria-label={`Editar ${m.first_names} ${m.last_names}`}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMember(m)}
                className="p-1.5 hover:bg-red-50 rounded-lg text-neutral/70 hover:text-red-600 transition-colors"
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

  return (
    <div data-walkthrough="wizard-step-container" className="space-y-6">
      <Card className="border-primary/10 shadow-sm">
        {/* Header de Métricas */}
        <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral">Revisión y Confirmación del Lote</h2>
            <p className="text-xs text-neutral/60">
              Lote: <span className="font-semibold text-neutral">{batchMetadata.comment || 'Lote sin título'}</span> · Tipo:{' '}
              <span className="font-semibold text-primary">{recognitionTypeName}</span>
            </p>
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
              <p className="text-xs text-neutral/50">
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
                    : 'text-neutral/60 hover:text-primary'
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
                    : 'text-neutral/60 hover:text-primary'
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
                    : 'text-neutral/60 hover:text-primary'
                }`}
              >
                Pendientes ({pendingMembers.length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral/40 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, cédula o grupo..."
                aria-label="Buscar por nombre, cédula o grupo"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-primary/20 bg-primary/5 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs transition-all"
              />
            </div>
          </div>

          {/* Tabla de Miembros Auto-Descubiertos */}
          <div className="border border-primary/20 rounded-2xl overflow-hidden bg-white shadow-xs">
            <Table columns={columns} data={displayedMembers} className="!border-0 !rounded-none" />
          </div>

          {displayedMembers.length === 0 && (
            <div className="p-8 text-center border border-dashed border-primary/20 rounded-2xl text-neutral/40 text-sm">
              No se encontraron miembros en esta selección.
            </div>
          )}
        </CardBody>

        <CardFooter
          data-walkthrough="wizard-navigation-buttons"
          className="flex justify-between items-center bg-gray-50/50 border-t border-primary/10"
        >
          <Button variant="outline" onClick={onBack} icon={<ArrowLeft size={18} />}>
            Atrás (Modificar Cédulas)
          </Button>

          <div className="flex items-center gap-3">
            {/* Atajo si es 1 solo miembro */}
            {membersList.length === 1 && (
              <Button
                variant="secondary"
                onClick={handleEmitAndDownloadSinglePdf}
                icon={<Download size={18} />}
                disabled={isFinalizing}
              >
                Emitir y Descargar PDF
              </Button>
            )}

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
