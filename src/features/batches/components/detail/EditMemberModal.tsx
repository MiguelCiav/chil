import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { Button } from '../../../../components/Button';
import { Field } from '../../../../components/Field';
import { ScoutMember, ScoutUnit } from '../../types';

export interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: ScoutMember | null;
  onSave: (member: ScoutMember) => Promise<void>;
}

interface EditMemberFormProps {
  member: ScoutMember;
  onClose: () => void;
  onSave: (member: ScoutMember) => Promise<void>;
}

const EditMemberForm: React.FC<EditMemberFormProps> = ({ member, onClose, onSave }) => {
  const [editingMember, setEditingMember] = useState<ScoutMember>(() => ({ ...member }));

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      editingMember.status === 'exceptional' &&
      (!editingMember.exceptional_reason || editingMember.exceptional_reason.trim() === '')
    ) {
      alert('Debe ingresar una justificación para la emisión excepcional.');
      return;
    }

    await onSave(editingMember);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
      <ModalBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Nombres *"
            value={editingMember.first_names}
            onChange={(e) => setEditingMember({ ...editingMember, first_names: e.target.value })}
            required
          />
          <Field
            label="Apellidos *"
            value={editingMember.last_names}
            onChange={(e) => setEditingMember({ ...editingMember, last_names: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Fecha de Nacimiento *"
            type="date"
            value={editingMember.birth_date}
            onChange={(e) => setEditingMember({ ...editingMember, birth_date: e.target.value })}
            required
          />
          <div>
            <label
              htmlFor="member-type-select"
              className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral"
            >
              Tipo de Miembro *
            </label>
            <select
              id="member-type-select"
              value={editingMember.member_type}
              onChange={(e) =>
                setEditingMember({
                  ...editingMember,
                  member_type: e.target.value as 'young' | 'adult'
                })
              }
              className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="young">Joven</option>
              <option value="adult">Adulto</option>
            </select>
          </div>
        </div>
        <div className="w-full">
          <label
            htmlFor="member-unit-select"
            className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral"
          >
            Unidad Scout *
          </label>
          <select
            id="member-unit-select"
            value={
              editingMember.unit ||
              (editingMember.member_type === 'young' ? 'tropa' : 'institucional')
            }
            onChange={(e) => {
              const newUnit = e.target.value as ScoutUnit;
              const wasUnverified =
                editingMember.verified_in_registry === false ||
                (!editingMember.verified_in_registry && editingMember.unit === 'no_scout');
              const isChangingToScout = newUnit !== 'no_scout';
              let nextStatus = editingMember.status;
              if (newUnit === 'no_scout') {
                nextStatus = 'active';
              } else if (
                wasUnverified &&
                isChangingToScout &&
                editingMember.status === 'active'
              ) {
                nextStatus = 'pending';
              }

              setEditingMember({
                ...editingMember,
                unit: newUnit,
                status: nextStatus
              });
            }}
            className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="manada">Manada</option>
            <option value="tropa">Tropa</option>
            <option value="caminantes">Caminantes</option>
            <option value="clan">Clan</option>
            <option value="institucional">Institucional</option>
            <option value="no_scout">No scout</option>
          </select>
        </div>
        {editingMember.status !== 'active' && (
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="exceptional-toggle"
                className="flex items-center gap-2.5 cursor-pointer font-bold text-xs sm:text-sm text-purple-900"
              >
                <input
                  id="exceptional-toggle"
                  type="checkbox"
                  checked={editingMember.status === 'exceptional'}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setEditingMember({
                      ...editingMember,
                      status: isChecked ? 'exceptional' : 'pending',
                      recognition_code: isChecked
                        ? editingMember.recognition_code ||
                          `REC-${editingMember.identity.slice(-4) || 'EXC'}`
                        : editingMember.recognition_code,
                      exceptional_reason: isChecked
                        ? editingMember.exceptional_reason || ''
                        : undefined
                    });
                  }}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600"
                />
                <span>Autorizar emisión de reconocimiento (Caso Excepcional)</span>
              </label>
            </div>
            <p className="text-xs text-purple-700">
              Permite emitir el reconocimiento oficial para este miembro aunque no figure en el
              registro nacional validado.
            </p>
            {editingMember.status === 'exceptional' && (
              <div className="space-y-1.5 pt-1">
                <label
                  htmlFor="detail-exceptional-reason"
                  className="block uppercase text-xs font-bold tracking-wide text-purple-900"
                >
                  Justificación de la emisión excepcional *
                </label>
                <textarea
                  id="detail-exceptional-reason"
                  aria-label="Justificación de la emisión excepcional"
                  rows={3}
                  required
                  placeholder="Indique el motivo por el cual se autoriza la emisión sin registro activo en el sistema..."
                  value={editingMember.exceptional_reason || ''}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, exceptional_reason: e.target.value })
                  }
                  className="w-full rounded-xl px-3.5 py-2.5 bg-white border border-purple-300 text-neutral focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm placeholder:text-neutral/40 transition-all"
                />
              </div>
            )}
          </div>
        )}
        <Field
          label="Correo Electrónico"
          type="email"
          value={editingMember.email || ''}
          onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
        />
        <Field
          label="Teléfono de Contacto"
          value={editingMember.phone || ''}
          onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
        />
        <Field
          label="Código de Reconocimiento"
          value={editingMember.recognition_code || ''}
          onChange={(e) =>
            setEditingMember({ ...editingMember, recognition_code: e.target.value })
          }
          placeholder="Ej. SP-5Y-001"
        />
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          Guardar Cambios
        </Button>
      </ModalFooter>
    </form>
  );
};

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  onSave
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <ModalHeader onClose={onClose}>Editar Datos de Miembro</ModalHeader>
      {isOpen && member && (
        <EditMemberForm
          key={member.identity}
          member={member}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Modal>
  );
};
