import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  User,
  Search,
  Edit2,
  ArrowLeft,
  RotateCcw,
  Eraser
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../../../../components/Card';
import { Button } from '../../../../components/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { Field } from '../../../../components/Field';
import { ScoutMember, ScoutUnit, getUnitBadge } from '../../types';
import { updateMember, getMembersByBatchId, assignBatchRecognitionCodes } from '../../api';

interface Step3ReviewProps {
  batchId: number;
  savedMembers: ScoutMember[];
  onMembersUpdated: (members: ScoutMember[]) => void;
  handleFinalizeBatch: () => void;
  onBack: () => void;
}

export const Step3Review: React.FC<Step3ReviewProps> = ({
  batchId,
  savedMembers,
  onMembersUpdated,
  handleFinalizeBatch,
  onBack
}) => {
  const [codeMode, setCodeMode] = useState<'auto' | 'manual'>('auto');
  const [activeTab, setActiveTab] = useState<'valid' | 'pending'>('valid');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState<ScoutMember | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Auto-assign codes on mount if auto mode and any active or exceptional member has no code assigned
  useEffect(() => {
    const hasUnassignedActive = savedMembers.some(
      m => (m.status === 'active' || m.status === 'exceptional') && (!m.recognition_code || m.recognition_code.trim() === '')
    );
    if (hasUnassignedActive && codeMode === 'auto' && savedMembers.length > 0) {
      const updated = assignBatchRecognitionCodes(savedMembers, 'auto');
      onMembersUpdated(updated);
    }
  }, [savedMembers, codeMode, onMembersUpdated]);

  const handleModeChange = (mode: 'auto' | 'manual') => {
    setCodeMode(mode);
    if (mode === 'auto') {
      const updated = assignBatchRecognitionCodes(savedMembers, 'auto');
      onMembersUpdated(updated);
    }
  };

  const handleRegenerateCodes = () => {
    const updated = assignBatchRecognitionCodes(savedMembers, 'auto');
    onMembersUpdated(updated);
  };

  const handleClearCodes = () => {
    const updated = assignBatchRecognitionCodes(savedMembers, 'manual');
    onMembersUpdated(updated);
  };

  const handleInlineCodeChange = (identity: string, newCode: string) => {
    const updated = savedMembers.map(m =>
      m.identity === identity ? { ...m, recognition_code: newCode.toUpperCase() } : m
    );
    onMembersUpdated(updated);
  };

  const validMembers = savedMembers.filter(m => m.status === 'active' || m.status === 'exceptional');
  const pendingMembers = savedMembers.filter(m => m.status === 'pending');

  const currentTabMembers = activeTab === 'valid' ? validMembers : pendingMembers;
  const filteredStep3Members = currentTabMembers.filter(m =>
    m.first_names.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.last_names.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.identity.includes(searchQuery) ||
    (m.recognition_code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totals = {
    total: savedMembers.length,
    young: savedMembers.filter(m => m.member_type === 'young').length,
    adult: savedMembers.filter(m => m.member_type === 'adult').length,
  };

  const handleEditMemberClick = (member: ScoutMember) => {
    setEditingMember({ ...member });
    setIsEditModalOpen(true);
  };

  const handleSaveEditedMember = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMember || !batchId) return;

    try {
      await updateMember(editingMember);
      const members = await getMembersByBatchId(batchId);
      onMembersUpdated(members);
      setIsEditModalOpen(false);
      setEditingMember(null);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la información del miembro.");
    }
  };

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      // Commit all members with their recognition_code to Firestore
      await Promise.all(savedMembers.map(member => updateMember(member)));
      handleFinalizeBatch();
    } catch (err) {
      console.error("Error saving member recognition codes:", err);
      alert("Error al guardar los códigos de reconocimiento de los miembros.");
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-primary/10">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="text-lg font-bold text-neutral">Revisión Final del Lote</div>
              <p className="text-sm text-neutral/50 font-normal">Verifique la información antes de generar los documentos.</p>
            </div>
            <div className="flex gap-4 text-sm font-semibold text-neutral">
              <div className="px-4 py-2 bg-primary/5 border border-primary/10 text-primary rounded-xl flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Total: {totals.total}</span>
              </div>
              <div className="px-4 py-2 border border-blue-100 bg-blue-50/70 text-blue-800 rounded-xl flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Jóvenes: {totals.young}</span>
              </div>
              <div className="px-4 py-2 border border-amber-100 bg-amber-50/70 text-amber-800 rounded-xl flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" />
                <span>Adultos: {totals.adult}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">

          {/* Recognition Code Strategy Control Bar */}
          <div className="bg-[#faf8f5] border border-primary/15 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-neutral">Códigos de Reconocimiento</h3>
                <p className="text-xs text-neutral/50">Seleccione la estrategia de asignación de códigos para los diplomas.</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {codeMode === 'auto' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRegenerateCodes}
                    icon={<RotateCcw size={14} />}
                    className="text-xs font-semibold border-primary/20 hover:bg-primary/10 text-primary py-1.5 px-3"
                  >
                    Regenerar códigos
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearCodes}
                  icon={<Eraser size={14} />}
                  className="text-xs font-semibold border-gray-200 hover:bg-gray-100 text-neutral/70 py-1.5 px-3"
                >
                  Limpiar códigos
                </Button>
              </div>
            </div>

            {/* Strategy Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  codeMode === 'auto'
                    ? 'bg-white border-primary shadow-sm ring-2 ring-primary/10'
                    : 'bg-white/60 border-gray-200 hover:border-primary/40'
                }`}
              >
                <input
                  type="radio"
                  name="recognitionCodeMode"
                  value="auto"
                  checked={codeMode === 'auto'}
                  onChange={() => handleModeChange('auto')}
                  className="mt-0.5 text-primary focus:ring-primary accent-primary"
                />
                <div className="text-xs">
                  <div className="font-bold text-neutral">Generar automáticamente</div>
                  <div className="text-neutral/50 mt-0.5">
                    Genera hashes únicos alfanuméricos como <span className="font-mono font-semibold text-primary">REC-A8F2</span> para todos los scouts activos.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  codeMode === 'manual'
                    ? 'bg-white border-primary shadow-sm ring-2 ring-primary/10'
                    : 'bg-white/60 border-gray-200 hover:border-primary/40'
                }`}
              >
                <input
                  type="radio"
                  name="recognitionCodeMode"
                  value="manual"
                  checked={codeMode === 'manual'}
                  onChange={() => handleModeChange('manual')}
                  className="mt-0.5 text-primary focus:ring-primary accent-primary"
                />
                <div className="text-xs">
                  <div className="font-bold text-neutral">Ingreso manual</div>
                  <div className="text-neutral/50 mt-0.5">
                    Permite escribir o personalizar los números de certificado oficiales para cada scout en la tabla.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Tab Filters */}
            <div className="flex bg-primary/5 p-1 rounded-xl border border-primary/15 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('valid')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'valid'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-neutral/60 hover:text-primary'
                  }`}
              >
                Registros Válidos{' '}
                <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-full">
                  {validMembers.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pending'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-neutral/60 hover:text-primary'
                  }`}
              >
                Registros Pendientes{' '}
                <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-red-50 text-red-600 rounded-full">
                  {pendingMembers.length}
                </span>
              </button>
            </div>

            {/* Search Field */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral/40 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre o cédula..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            {filteredStep3Members.map(member => {
              const initials = `${member.first_names[0] || ''}${member.last_names[0] || ''}`.toUpperCase();
              return (
                <div
                  key={member.identity}
                  className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-white border border-primary/10 rounded-2xl hover:bg-primary/5 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm tracking-wider flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <div className="font-semibold text-neutral">{member.first_names} {member.last_names}</div>
                      <div className="text-xs text-neutral/50 font-medium">C.I. {member.identity} • {member.member_type === 'young' ? 'Joven' : 'Adulto'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
                    {member.status === 'active' || member.status === 'exceptional' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-neutral/60 tracking-wider uppercase whitespace-nowrap">
                          CÓDIGO:
                        </span>
                        <input
                          id={`rec-code-${member.identity}`}
                          type="text"
                          value={member.recognition_code || ''}
                          onChange={(e) => handleInlineCodeChange(member.identity, e.target.value)}
                          placeholder="Ej. REC-001"
                          className="w-32 sm:w-36 font-mono text-xs font-bold uppercase px-3 py-1.5 rounded-xl border border-primary/20 bg-white text-neutral focus:outline-none focus:ring-2 focus:ring-primary shadow-inner transition-all placeholder:font-sans placeholder:font-normal placeholder:text-neutral/40"
                          aria-label={`Código de reconocimiento de ${member.first_names} ${member.last_names}`}
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-neutral/40 italic px-2">Sin código</span>
                    )}

                    {(() => {
                      const unitBadge = getUnitBadge(member.unit);
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${unitBadge.badgeClass}`}>
                          {unitBadge.label}
                        </span>
                      );
                    })()}

                    {member.status === 'active' ? (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-[#e6f7eb] text-[#1b7a37] border border-[#c3eed0] rounded-full">
                        Válido
                      </span>
                    ) : member.status === 'exceptional' ? (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-[#f3e8ff] text-[#7e22ce] border border-[#e9d5ff] rounded-full">
                        Excepcional
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-[#feeae8] text-[#c92a2a] border border-[#fccfca] rounded-full">
                        Pendiente
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleEditMemberClick(member)}
                      className="p-2 border border-gray-200 hover:border-primary rounded-xl text-neutral hover:text-primary transition-all bg-white group-hover:scale-105"
                      aria-label={`Editar información de ${member.first_names} ${member.last_names}`}
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredStep3Members.length === 0 && (
              <div className="p-8 text-center border border-dashed border-primary/20 rounded-2xl text-neutral/40">
                No se encontraron miembros en esta categoría.
              </div>
            )}
          </div>
        </CardBody>
        <CardFooter>
          <Button
            variant="outline"
            onClick={onBack}
            icon={<ArrowLeft size={18} />}
          >
            Atrás
          </Button>
          <Button
            variant="primary"
            onClick={handleFinalize}
            disabled={isFinalizing}
          >
            {isFinalizing ? 'Guardando...' : 'Generar Lote'}
          </Button>
        </CardFooter>
      </Card>

      {/* Manual Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-xl">
        <ModalHeader onClose={() => setIsEditModalOpen(false)}>Editar Información de Miembro</ModalHeader>
        {editingMember && (
          <form onSubmit={handleSaveEditedMember} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <ModalBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Nombres *"
                  value={editingMember.first_names}
                  onChange={e => setEditingMember({ ...editingMember, first_names: e.target.value })}
                  required
                />
                <Field
                  label="Apellidos *"
                  value={editingMember.last_names}
                  onChange={e => setEditingMember({ ...editingMember, last_names: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="w-full">
                  <label htmlFor="edit-member-type-select" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
                    Tipo de Miembro *
                  </label>
                  <select
                    id="edit-member-type-select"
                    className="w-full rounded-field px-4 transition-all bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px]"
                    value={editingMember.member_type}
                    onChange={e => setEditingMember({ ...editingMember, member_type: e.target.value as 'young' | 'adult' })}
                    required
                  >
                    <option value="young">Joven</option>
                    <option value="adult">Adulto</option>
                  </select>
                </div>
                <div className="w-full">
                  <label htmlFor="edit-member-unit-select" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
                    Unidad Scout *
                  </label>
                  <select
                    id="edit-member-unit-select"
                    className="w-full rounded-field px-4 transition-all bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px]"
                    value={editingMember.unit || (editingMember.member_type === 'young' ? 'tropa' : 'institucional')}
                    onChange={e => {
                      const newUnit = e.target.value as ScoutUnit;
                      setEditingMember({
                        ...editingMember,
                        unit: newUnit,
                        ...(newUnit === 'no_scout' ? { status: 'active' } : {})
                      });
                    }}
                    required
                  >
                    <option value="manada">Manada</option>
                    <option value="tropa">Tropa</option>
                    <option value="caminantes">Caminantes</option>
                    <option value="clan">Clan</option>
                    <option value="institucional">Institucional</option>
                    <option value="no_scout">No scout</option>
                  </select>
                </div>
              </div>
              {editingMember.status !== 'active' && (
                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="step3-exceptional-toggle" className="flex items-center gap-2.5 cursor-pointer font-bold text-xs sm:text-sm text-purple-900">
                      <input
                        id="step3-exceptional-toggle"
                        type="checkbox"
                        checked={editingMember.status === 'exceptional'}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setEditingMember({
                            ...editingMember,
                            status: isChecked ? 'exceptional' : 'pending',
                            recognition_code: isChecked
                              ? (editingMember.recognition_code || `REC-${editingMember.identity.slice(-4) || 'EXC'}`)
                              : editingMember.recognition_code
                          });
                        }}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600"
                      />
                      <span>Autorizar emisión de diploma (Caso Excepcional)</span>
                    </label>
                  </div>
                  <p className="text-xs text-purple-700">
                    Permite emitir el diploma oficial para este miembro aunque no figure en el registro nacional validado.
                  </p>
                </div>
              )}
              <Field
                label="Código de Reconocimiento"
                value={editingMember.recognition_code || ''}
                onChange={e => setEditingMember({ ...editingMember, recognition_code: e.target.value.toUpperCase() })}
                placeholder="Ej. REC-001"
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

