import React, { useState } from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Field,
  Select,
  ErrorAlert
} from '../../../../components';
import { MemberHierarchySelects } from '../../../../domain/components';
import {
  BatchCodeMode,
  ScoutGroup,
  ScoutMember,
  ScoutUnit,
  Region,
  District
} from '../../types';
import {
  generateUniqueRecognitionCode,
  validateManualRecognitionCode
} from '../../utils/codeGenerator';
import {
  getMemberDocId,
  hasInvalidDocPathChars,
  isGenericIdentity,
  normalizeCedula
} from '../../utils/memberIdentity';

export type EditMemberLifecycle = 'draft' | 'emitted';

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
  lifecycle?: EditMemberLifecycle;
  batchCodeMode?: BatchCodeMode;
  existingIdentities?: string[];
  existingCodes?: string[];
}

interface EditMemberFormProps {
  member: ScoutMember;
  onClose: () => void;
  onSave: (member: ScoutMember) => Promise<void>;
  regions?: Region[];
  districts?: District[];
  groups?: ScoutGroup[];
  showContactFields?: boolean;
  lifecycle: EditMemberLifecycle;
  batchCodeMode: BatchCodeMode;
  existingIdentities: string[];
  existingCodes: string[];
}

function computeNextMemberUnitState(
  editingMember: ScoutMember,
  newUnit: ScoutUnit,
  lifecycle: EditMemberLifecycle
): ScoutMember {
  if (lifecycle === 'emitted') {
    // In emitted mode, unit stays within Scout units (or no_scout stays no_scout) without changing status
    return {
      ...editingMember,
      unit: newUnit
    };
  }

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
  showContactFields = true,
  lifecycle,
  batchCodeMode,
  existingIdentities,
  existingCodes
}) => {
  const [editingMember, setEditingMember] = useState<ScoutMember>(() => ({ ...member }));
  const [formError, setFormError] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const isEmitted = lifecycle === 'emitted';
  const savedIsNoScout = member.unit === 'no_scout';
  const savedHasCode = Boolean(member.recognition_code?.trim());
  const isIdentityLocked = isEmitted && member.status === 'active' && !savedIsNoScout;
  const isExceptionalToggleLocked =
    isEmitted && member.status === 'exceptional' && savedHasCode;

  const isCodeDisabled = (() => {
    if (!isEmitted) return false;
    if (savedHasCode) return true;
    if (editingMember.status === 'pending') return true;
    if (editingMember.status === 'exceptional' && batchCodeMode === 'auto') return true;
    return false;
  })();

  const handleExceptionalToggle = (isChecked: boolean) => {
    setReasonError(null);
    setCodeError(null);
    setFormError(null);

    if (!isChecked) {
      setEditingMember({
        ...editingMember,
        status: 'pending',
        recognition_code: savedHasCode ? member.recognition_code : '',
        exceptional_reason: undefined
      });
      return;
    }

    let nextCode = editingMember.recognition_code?.trim() || '';
    if (!nextCode && batchCodeMode === 'auto') {
      nextCode = generateUniqueRecognitionCode(existingCodes);
    }

    setEditingMember({
      ...editingMember,
      status: 'exceptional',
      recognition_code: nextCode,
      exceptional_reason: editingMember.exceptional_reason || ''
    });
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setIdentityError(null);
    setReasonError(null);
    setCodeError(null);

    let nextIdentity = editingMember.identity;

    if (isEmitted && !isIdentityLocked) {
      const trimmedId = editingMember.identity.trim();
      if (hasInvalidDocPathChars(trimmedId)) {
        setIdentityError('La cédula no puede contener el carácter "/".');
        return;
      }

      const identityChanged = trimmedId !== member.identity.trim();

      if (!savedIsNoScout) {
        if (!trimmedId || isGenericIdentity(trimmedId)) {
          setIdentityError('Debe ingresar una cédula válida para un miembro Scout.');
          return;
        }
        nextIdentity = identityChanged ? normalizeCedula(trimmedId) : member.identity;
      } else {
        if (!trimmedId) {
          setIdentityError('Debe ingresar una cédula o "S/C" para el miembro.');
          return;
        }
        nextIdentity = identityChanged
          ? isGenericIdentity(trimmedId)
            ? trimmedId.toUpperCase()
            : trimmedId
          : member.identity;
      }

      if (!isGenericIdentity(nextIdentity)) {
        const normalizedNext = normalizeCedula(nextIdentity);
        const isDuplicate = existingIdentities.some(
          (existing) => !isGenericIdentity(existing) && normalizeCedula(existing) === normalizedNext
        );
        if (isDuplicate) {
          setIdentityError('Ya existe otro miembro con esta cédula en el lote.');
          return;
        }
      }
    }

    if (
      editingMember.status === 'exceptional' &&
      (!editingMember.exceptional_reason || editingMember.exceptional_reason.trim() === '')
    ) {
      const msg = 'Debe ingresar una justificación para la emisión excepcional.';
      setReasonError(msg);
      setFormError(msg);
      return;
    }

    let nextCode = editingMember.recognition_code;
    if (isEmitted && !savedHasCode && editingMember.status === 'exceptional') {
      if (batchCodeMode === 'manual') {
        const validation = validateManualRecognitionCode(
          editingMember.recognition_code || '',
          existingCodes
        );
        if (validation.error) {
          setCodeError(validation.error);
          setFormError(validation.error);
          return;
        }
        nextCode = validation.normalized;
      } else if (!nextCode?.trim()) {
        nextCode = generateUniqueRecognitionCode(existingCodes);
      }
    }

    await onSave({
      ...editingMember,
      identity: nextIdentity,
      recognition_code: nextCode
    });
  };

  const unitValue =
    editingMember.unit ||
    (editingMember.member_type === 'young' ? 'tropa' : 'institucional');

  const unitSelect = (
    <Select
      id="member-unit-select"
      label="Unidad Scout *"
      value={unitValue}
      disabled={isEmitted && savedIsNoScout}
      onChange={(e) =>
        setEditingMember(
          computeNextMemberUnitState(editingMember, e.target.value as ScoutUnit, lifecycle)
        )
      }
    >
      {(!isEmitted || !savedIsNoScout) && (
        <>
          <option value="manada">Manada</option>
          <option value="tropa">Tropa</option>
          <option value="caminantes">Caminantes</option>
          <option value="clan">Clan</option>
          <option value="institucional">Institucional</option>
        </>
      )}
      {(!isEmitted || savedIsNoScout) && <option value="no_scout">No scout</option>}
    </Select>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
      <ModalBody className="space-y-4">
        {formError && <ErrorAlert variant="compact" message={formError} />}

        {isEmitted && (
          <div>
            <Field
              id="member-identity-input"
              label="Cédula *"
              value={editingMember.identity}
              disabled={isIdentityLocked}
              variant={identityError ? 'error' : 'default'}
              errorText={identityError ?? undefined}
              onChange={(e) => {
                setIdentityError(null);
                setEditingMember({ ...editingMember, identity: e.target.value });
              }}
              placeholder={savedIsNoScout ? 'Ej. 12345678 o S/C' : 'Ej. 12345678'}
            />
            {isIdentityLocked && (
              <p className="text-xs text-neutral/70 mt-1">
                La cédula de un miembro Scout activo es inmutable para preservar la auditoría del lote.
              </p>
            )}
          </div>
        )}

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
                className={`flex items-center gap-2.5 font-bold text-xs sm:text-sm text-purple-900 ${
                  isExceptionalToggleLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                }`}
              >
                <input
                  id="exceptional-toggle"
                  type="checkbox"
                  checked={editingMember.status === 'exceptional'}
                  disabled={isExceptionalToggleLocked}
                  onChange={(e) => handleExceptionalToggle(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600"
                />
                <span>Autorizar emisión de reconocimiento (Caso Excepcional)</span>
              </label>
            </div>
            <p className="text-xs text-purple-700">
              {isExceptionalToggleLocked
                ? 'Emisión excepcional ya autorizada con código bloqueado; re-verifica en Impeesa para actualizar a Activo.'
                : 'Permite emitir el reconocimiento oficial para este miembro aunque no figure en el registro nacional validado.'}
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
                  variant={reasonError ? 'error' : 'default'}
                  errorText={reasonError ?? undefined}
                  placeholder="Indique el motivo por el cual se autoriza la emisión sin registro activo en el sistema..."
                  value={editingMember.exceptional_reason || ''}
                  onChange={(e) => {
                    setReasonError(null);
                    setEditingMember({ ...editingMember, exceptional_reason: e.target.value });
                  }}
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

        <div>
          <Field
            id="member-recognition-code-input"
            label="Código de Reconocimiento"
            value={editingMember.recognition_code || ''}
            disabled={isCodeDisabled}
            variant={codeError ? 'error' : 'default'}
            errorText={codeError ?? undefined}
            onChange={(e) => {
              setCodeError(null);
              setEditingMember({
                ...editingMember,
                recognition_code:
                  isEmitted || !showContactFields ? e.target.value.toUpperCase() : e.target.value
              });
            }}
            placeholder={showContactFields ? 'Ej. SP-5Y-001' : 'Ej. REC-001'}
          />
          {isEmitted && savedHasCode && (
            <p className="text-xs text-neutral/70 mt-1">
              El código de reconocimiento emitido queda bloqueado tras guardarse.
            </p>
          )}
        </div>
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
  showContactFields = true,
  lifecycle = 'draft',
  batchCodeMode = 'auto',
  existingIdentities = [],
  existingCodes = []
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <ModalHeader onClose={onClose}>{title}</ModalHeader>
      {isOpen && member && (
        <EditMemberForm
          key={getMemberDocId(member)}
          member={member}
          onClose={onClose}
          onSave={onSave}
          regions={regions}
          districts={districts}
          groups={groups}
          showContactFields={showContactFields}
          lifecycle={lifecycle}
          batchCodeMode={batchCodeMode}
          existingIdentities={existingIdentities}
          existingCodes={existingCodes}
        />
      )}
    </Modal>
  );
};
