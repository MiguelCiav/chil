import React, { useState } from 'react';
import { Users, GraduationCap, User, Search, Edit2, ArrowLeft, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../../../../components/Card';
import { Button } from '../../../../components/Button';
import { Field } from '../../../../components/Field';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { ScoutMember } from '../../types';
import { updateMember, getMembersByBatchId } from '../../api';

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
  const [activeTab, setActiveTab] = useState<'valid' | 'pending'>('valid');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState<ScoutMember | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const validMembers = savedMembers.filter(m => m.status === 'active');
  const pendingMembers = savedMembers.filter(m => m.status === 'pending');

  const filteredStep3Members = (activeTab === 'valid' ? validMembers : pendingMembers).filter(m => {
    const term = searchQuery.toLowerCase();
    const fullName = `${m.first_names} ${m.last_names}`.toLowerCase();
    return fullName.includes(term) || m.identity.includes(term);
  });

  const totals = {
    total: savedMembers.length,
    young: savedMembers.filter(m => m.member_type === 'young').length,
    adult: savedMembers.filter(m => m.member_type === 'adult').length,
  };

  const handleEditMemberClick = (member: ScoutMember) => {
    setEditingMember(member);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedMember = async (e: React.FormEvent<HTMLFormElement>) => {
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
              <div className="px-4 py-2 bg-primary/10 border border-primary/15 rounded-xl flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Total: {totals.total}</span>
              </div>
              <div className="px-4 py-2 bg-blue-50 border border-blue-150 rounded-xl flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Jóvenes: {totals.young}</span>
              </div>
              <div className="px-4 py-2 bg-amber-50 border border-amber-150 rounded-xl flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" />
                <span>Adultos: {totals.adult}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Tab Filters */}
            <div className="flex bg-primary/5 p-1 rounded-xl border border-primary/15 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('valid')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'valid'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-neutral/60 hover:text-primary'
                }`}
              >
                Registros Válidos
                <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-full">
                  {validMembers.length}
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
                Registros Pendientes
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
                  className="flex justify-between items-center p-4 bg-white border border-primary/10 rounded-2xl hover:bg-primary/5 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm tracking-wider">
                      {initials}
                    </div>
                    <div>
                      <div className="font-semibold text-neutral">{member.first_names} {member.last_names}</div>
                      <div className="text-xs text-neutral/50 font-medium">C.I. {member.identity} • {member.member_type === 'young' ? 'Joven' : 'Adulto'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {member.status === 'active' ? (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full">
                        Válido
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full">
                        Pendiente
                      </span>
                    )}

                    <button
                      onClick={() => handleEditMemberClick(member)}
                      className="p-2 border border-gray-200 hover:border-primary rounded-xl text-neutral hover:text-primary transition-all bg-white group-hover:scale-105"
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
            onClick={handleFinalizeBatch}
            icon={<Sparkles size={18} />}
          >
            Generar Lote 🚀
          </Button>
        </CardFooter>
      </Card>

      {/* Manual Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-xl">
        <ModalHeader onClose={() => setIsEditModalOpen(false)}>Editar Información de Miembro</ModalHeader>
        {editingMember && (
          <form onSubmit={handleSaveEditedMember}>
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
              <div className="w-full">
                <label className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
                  Tipo de Miembro *
                </label>
                <select
                  className="w-full rounded-field px-4 transition-all bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px]"
                  value={editingMember.member_type}
                  onChange={e => setEditingMember({ ...editingMember, member_type: e.target.value as 'young' | 'adult' })}
                  required
                >
                  <option value="young">Joven</option>
                  <option value="adult">Adulto</option>
                </select>
              </div>
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
