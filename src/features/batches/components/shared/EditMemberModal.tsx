import React, { useState } from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Field,
  Select
} from '../../../../components';
import { MemberHierarchySelects } from '../../../../domain/components';
import { ScoutGroup, ScoutMember, ScoutUnit, Region, District } from '../../types';

export interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: ScoutMember | null;
  onSave: (member: ScoutMember) => Promise<void>;
  regions?: Region[];
  districts?: District[];
  groups?: ScoutGroup[];
  title?: string;
  showContactFields?: boolean;
}

interface EditMemberFormProps {
  member: ScoutMember;
  onClose: () => void;
  onSave: (member: ScoutMember) => Promise<void>;
  regions?: Region[];
  districts?: District[];
  groups?: ScoutGroup[];
  showContactFields?: boolean;
}

function getExceptionalRecognitionCode(
  member: ScoutMember,
  isChecked: boolean
): string | undefined {
  if (!isChecked) {
    return member.recognition_code;
  }
  if (member.recognition_code) {
    return member.recognition_code;
  }
  const suffix = member.identity.slice(-4) || 'EXC';
  return `REC-${suffix}`;
}

function computeNextMemberUnitState(
  editingMember: ScoutMember,
  newUnit: ScoutUnit
): ScoutMember {
  const wasUnverified =
    editingMember.verified_in_registry === false ||
    (!editingMember.verified_in_registry && editingMember.unit === 'no_scout');
  const isChangingToScout = newUnit !== 'no_scout';
  let nextStatus = editingMember.status;
  if (newUnit === 'no_scout') {
    nextStatus = 'active';
  } else if (wasUnverified && isChangingToScout && editingMember.status === 'active') {
    nextStatus = 'pending';
  }

  return {
    ...editingMember,
    unit: newUnit,
    status: nextStatus
  };
}

const EditMemberForm: React.FC<EditMemberFormProps> = ({
  member,
  onClose,
  onSave,
  regions = [],
  districts = [],
  groups = [],
  showContactFields = true
}) => {
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

  const unitValue =
    editingMember.unit ||
    (editingMember.member_type === 'young' ? 'tropa' : 'institucional');

  const unitSelect = (
    <Select
      id="member-unit-select"
      label="Unidad Scout *"
      value={unitValue}
      onChange={(e) =>
        setEditingMember(computeNextMemberUnitState(editingMember, e.target.value as ScoutUnit))
      }
    >
      <option value="manada">Manada</option>
      <option value="tropa">Tropa</option>
      <option value="caminantes">Caminantes</option>
      <option value="clan">Clan</option>
      <option value="institucional">Institucional</option>
      <option value="no_scout">No scout</option>
    </Select>
  );

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
          {showContactFields && (
            <Field
              label="Fecha de Nacimiento *"
              type="date"
              value={editingMember.birth_date}
              onChange={(e) => setEditingMember({ ...editingMember, birth_date: e.target.value })}
              required
            />
          )}
          <Select
            id="member-type-select"
            label="Tipo de Miembro *"
            value={editingMember.member_type}
            onChange={(e) =>
              setEditingMember({
                ...editingMember,
                member_type: e.target.value as 'young' | 'adult'
              })
            }
          >
            <option value="young">Joven</option>
            <option value="adult">Adulto</option>
          </Select>
          {!showContactFields && unitSelect}
        </div>

        {showContactFields && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{unitSelect}</div>
        )}

        {(regions.length > 0 || districts.length > 0 || groups.length > 0) && (
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral/75">
              Estructura Scout
            </h4>
            <MemberHierarchySelects
              hideWhenEmpty
              regions={regions}
              districts={districts}
              groups={groups}
              regionId={editingMember.region_id ?? 0}
              districtId={editingMember.district_id ?? 0}
              groupId={editingMember.group_id ?? 0}
              onChange={(next) =>
                setEditingMember({
                  ...editingMember,
                  region_id: next.region_id,
                  region_name: next.region_id === 0 ? undefined : next.region_name || undefined,
                  district_id: next.district_id,
                  district_name:
                    next.district_id === 0 ? undefined : next.district_name || undefined,
                  group_id: next.group_id,
                  group_name: next.group_id === 0 ? undefined : next.group_name || undefined
                })
              }
            />
          </div>
        )}

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
                      recognition_code: getExceptionalRecognitionCode(editingMember, isChecked),
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
              <div className="pt-1">
                <Field
                  id="detail-exceptional-reason"
                  label="Justificación de la emisión excepcional *"
                  aria-label="Justificación de la emisión excepcional"
                  multiline
                  rows={3}
                  required
                  placeholder="Indique el motivo por el cual se autoriza la emisión sin registro activo en el sistema..."
                  value={editingMember.exceptional_reason || ''}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, exceptional_reason: e.target.value })
                  }
                  className="bg-white border-purple-600 focus-visible:ring-purple-700"
                />
              </div>
            )}
          </div>
        )}

        {showContactFields && (
          <>
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
          </>
        )}

        <Field
          label="Código de Reconocimiento"
          value={editingMember.recognition_code || ''}
          onChange={(e) =>
            setEditingMember({
              ...editingMember,
              recognition_code: showContactFields ? e.target.value : e.target.value.toUpperCase()
            })
          }
          placeholder={showContactFields ? 'Ej. SP-5Y-001' : 'Ej. REC-001'}
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
  onSave,
  regions,
  districts,
  groups,
  title = 'Editar Datos de Miembro',
  showContactFields = true
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <ModalHeader onClose={onClose}>{title}</ModalHeader>
      {isOpen && member && (
        <EditMemberForm
          key={member.identity}
          member={member}
          onClose={onClose}
          onSave={onSave}
          regions={regions}
          districts={districts}
          groups={groups}
          showContactFields={showContactFields}
        />
      )}
    </Modal>
  );
};
