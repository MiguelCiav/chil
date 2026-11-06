import React, { useState, useMemo } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { Button } from '../../../../components/Button';
import { Field } from '../../../../components/Field';
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

  const availableDistricts = useMemo(() => {
    if (!regionId || regionId === 0) return districts.filter((d) => d.id !== 0);
    return districts.filter((d) => d.id !== 0 && d.region_id === regionId);
  }, [districts, regionId]);

  const availableGroups = useMemo(() => {
    if (!districtId || districtId === 0) return groups.filter((g) => g.id !== 0);
    return groups.filter((g) => g.id !== 0 && g.district_id === districtId);
  }, [groups, districtId]);

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
        region_id: regionId && regionId !== 0 ? regionId : undefined,
        district_id: districtId && districtId !== 0 ? districtId : undefined,
        group_id: groupId && groupId !== 0 ? groupId : undefined
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
          <p className="text-xs text-neutral/60">
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
            <div>
              <label
                htmlFor="manual-member-type"
                className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral"
              >
                Tipo de Miembro *
              </label>
              <select
                id="manual-member-type"
                value={memberType}
                onChange={(e) => setMemberType(e.target.value as 'young' | 'adult')}
                className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="adult">Adulto</option>
                <option value="young">Joven</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="manual-member-unit"
                className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral"
              >
                Rama / Unidad *
              </label>
              <select
                id="manual-member-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as ScoutUnit)}
                className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="no_scout">No scout / Invitado</option>
                <option value="institucional">Institucional</option>
                <option value="manada">Manada</option>
                <option value="tropa">Tropa</option>
                <option value="caminantes">Caminantes</option>
                <option value="clan">Clan</option>
              </select>
            </div>
          </div>

          <Field
            label="Fecha de Nacimiento"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />

          {(regions.length > 0 || districts.length > 0 || groups.length > 0) && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral/70">
                Estructura Scout (Opcional)
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={regionId ?? 0}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setRegionId(id === 0 ? undefined : id);
                    setDistrictId(undefined);
                    setGroupId(undefined);
                  }}
                  className="rounded-field px-2.5 py-2 bg-primary/5 border border-primary/20 text-neutral text-xs"
                >
                  <option value={0}>Región...</option>
                  {regions.filter((r) => r.id !== 0).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>

                <select
                  value={districtId ?? 0}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setDistrictId(id === 0 ? undefined : id);
                    setGroupId(undefined);
                  }}
                  className="rounded-field px-2.5 py-2 bg-primary/5 border border-primary/20 text-neutral text-xs"
                >
                  <option value={0}>Distrito...</option>
                  {availableDistricts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                <select
                  value={groupId ?? 0}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setGroupId(id === 0 ? undefined : id);
                  }}
                  className="rounded-field px-2.5 py-2 bg-primary/5 border border-primary/20 text-neutral text-xs"
                >
                  <option value={0}>Grupo...</option>
                  {availableGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
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
