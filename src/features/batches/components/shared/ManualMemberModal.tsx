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

export interface ManualMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: ScoutMember) => Promise<void>;
  regions?: Region[];
  districts?: District[];
  groups?: ScoutGroup[];
  batchId?: number | null;
  userId?: string;
}

export const ManualMemberModal: React.FC<ManualMemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  regions = [],
  districts = [],
  groups = [],
  batchId,
  userId
}) => {
  const [identity, setIdentity] = useState('');
  const [firstNames, setFirstNames] = useState('');
  const [lastNames, setLastNames] = useState('');
  const [birthDate, setBirthDate] = useState('1990-01-01');
  const [memberType, setMemberType] = useState<'young' | 'adult'>('adult');
  const [unit, setUnit] = useState<ScoutUnit>('no_scout');
  const [regionId, setRegionId] = useState<number | undefined>(undefined);
  const [districtId, setDistrictId] = useState<number | undefined>(undefined);
  const [groupId, setGroupId] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!identity.trim() || !firstNames.trim()) {
      alert('La cédula y nombres son obligatorios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newMember: ScoutMember = {
        identity: identity.trim().replace(/[^0-9a-zA-Z-]/g, ''),
        first_names: firstNames.trim(),
        last_names: lastNames.trim(),
        birth_date: birthDate || '1990-01-01',
        member_type: memberType,
        unit,
        status: 'active',
        verified_in_registry: unit !== 'no_scout',
        batch_id: batchId ?? undefined,
        user_id: userId,
        region_id: regionId ?? 0,
        district_id: districtId ?? 0,
        group_id: groupId ?? 0
      };

      await onSave(newMember);
      setIdentity('');
      setFirstNames('');
      setLastNames('');
      onClose();
    } catch (err) {
      console.error('Failed to create manual member:', err);
      alert('Error al agregar el miembro manual.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <ModalHeader onClose={onClose}>Agregar Miembro Manual / No Scout</ModalHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
        <ModalBody className="space-y-4">
          <p className="text-xs text-neutral/75">
            Agrega colaboradores, autoridades o personas que no figuren en el registro de scouts.
          </p>

          <Field
            label="Cédula de Identidad *"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="Ej. 12345678"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Nombres *"
              value={firstNames}
              onChange={(e) => setFirstNames(e.target.value)}
              placeholder="Ej. Juan"
              required
            />
            <Field
              label="Apellidos *"
              value={lastNames}
              onChange={(e) => setLastNames(e.target.value)}
              placeholder="Ej. Pérez"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="manual-member-type"
              label="Tipo de Miembro *"
              value={memberType}
              onChange={(e) => setMemberType(e.target.value as 'young' | 'adult')}
            >
              <option value="adult">Adulto</option>
              <option value="young">Joven</option>
            </Select>

            <Select
              id="manual-member-unit"
              label="Rama / Unidad *"
              value={unit}
              onChange={(e) => setUnit(e.target.value as ScoutUnit)}
            >
              <option value="no_scout">No scout / Invitado</option>
              <option value="institucional">Institucional</option>
              <option value="manada">Manada</option>
              <option value="tropa">Tropa</option>
              <option value="caminantes">Caminantes</option>
              <option value="clan">Clan</option>
            </Select>
          </div>

          <Field
            label="Fecha de Nacimiento"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />

          {(regions.length > 0 || districts.length > 0 || groups.length > 0) && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral/75">
                Estructura Scout (Opcional)
              </h4>
              <MemberHierarchySelects
                hideWhenEmpty
                size="sm"
                layout="grid"
                regions={regions}
                districts={districts}
                groups={groups}
                regionId={regionId ?? 0}
                districtId={districtId ?? 0}
                groupId={groupId ?? 0}
                onChange={(next) => {
                  setRegionId(next.region_id === 0 ? undefined : next.region_id);
                  setDistrictId(next.district_id === 0 ? undefined : next.district_id);
                  setGroupId(next.group_id === 0 ? undefined : next.group_id);
                }}
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Agregar Miembro'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
