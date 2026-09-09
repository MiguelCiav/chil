import React, { useState, useMemo, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, Check, AlertTriangle, AlertCircle, ArrowLeft, ArrowRight, Edit2 } from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../../../../components/Card';
import { Button } from '../../../../components/Button';
import { Field } from '../../../../components/Field';
import { Table } from '../../../../components/Table';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { MemberVerificationResult, Region, District, ScoutGroup, ScoutUnit } from '../../types';

interface Step2VerificationProps {
  readonly batchName: string;
  readonly youngCedulas: string;
  readonly setYoungCedulas: (val: string) => void;
  readonly adultCedulas: string;
  readonly setAdultCedulas: (val: string) => void;
  readonly isVerifying: boolean;
  readonly verifyProgress: { readonly current: number; readonly total: number };
  readonly verificationList: readonly MemberVerificationResult[];
  readonly handleVerify: () => void;
  readonly verifyCedula: (cedula: string, type: 'young' | 'adult', unit?: ScoutUnit) => void;
  readonly handleToggleMemberType: (cedula: string) => void;
  readonly handleStep2Continue: () => void;
  readonly onBack: () => void;
  readonly regions?: readonly Region[];
  readonly districts?: readonly District[];
  readonly groups?: readonly ScoutGroup[];
  readonly onUpdateMemberGroup?: (cedula: string, groupId: number) => void;
  readonly onUpdateMemberHierarchy?: (
    cedula: string,
    hierarchy: { region_id?: number; district_id?: number; group_id?: number }
  ) => void;
}

interface StatusBadgeProps {
  readonly status: string;
  readonly onRetry?: () => void;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, onRetry }) => {
  if (status === 'Consultando...') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 animate-pulse border border-blue-200">
        <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
        Consultando...
      </span>
    );
  }
  if (status === 'Registro válido') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
        <Check className="w-3.5 h-3.5 mr-1" />
        Registro válido
      </span>
    );
  }
  if (status === 'No registrado') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
        No registrado
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
        <AlertCircle className="w-3.5 h-3.5 mr-1" />
        Error de red
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="p-1 hover:bg-primary/10 rounded text-primary transition-colors"
          title="Reintentar verificación"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

interface MemberTypeToggleProps {
  readonly type: 'young' | 'adult';
  readonly onToggle: () => void;
}

const MemberTypeToggle: React.FC<MemberTypeToggleProps> = ({ type, onToggle }) => (
  <div className="flex items-center">
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1 rounded-l-md text-xs font-semibold border border-r-0 transition-colors ${
        type === 'young'
          ? 'bg-primary text-white border-primary'
          : 'bg-white hover:bg-gray-50 border-gray-300 text-neutral'
      }`}
    >
      Joven
    </button>
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1 rounded-r-md text-xs font-semibold border transition-colors ${
        type === 'adult'
          ? 'bg-primary text-white border-primary'
          : 'bg-white hover:bg-gray-50 border-gray-300 text-neutral'
      }`}
    >
      Adulto
    </button>
  </div>
);

const CedulaCell: React.FC<{ readonly value: string }> = ({ value }) => (
  <span className="font-semibold text-neutral">{value}</span>
);

const NameCell: React.FC<{ readonly value: string }> = ({ value }) => (
  <span className="text-neutral/80">{value || 'Pendiente...'}</span>
);

const MemberHierarchyCell: React.FC<{
  readonly member: MemberVerificationResult;
  readonly groups?: readonly ScoutGroup[];
  readonly onChangeGroup?: (groupId: number) => void;
  readonly onOpenModal?: (member: MemberVerificationResult) => void;
}> = ({ member, groups = [], onChangeGroup, onOpenModal }) => {
  return (
    <div className="flex items-center gap-1.5">
      {groups.length > 0 && onChangeGroup && (
        <select
          aria-label={`Grupo scout de ${member.name || member.cedula}`}
          value={member.group_id ?? 0}
          onChange={(e) => onChangeGroup(Number(e.target.value))}
          className="text-xs py-1 px-2 rounded-lg border border-primary/20 bg-white text-neutral focus:outline-none focus:ring-1 focus:ring-primary max-w-[150px] truncate"
        >
          <option value={0}>Sin grupo</option>
          {groups
            .filter(g => g.id !== 0)
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
        </select>
      )}
      {onOpenModal && (
        <button
          type="button"
          onClick={() => onOpenModal(member)}
          className="p-1 hover:bg-primary/10 rounded text-primary transition-colors flex-shrink-0"
          title="Editar región, distrito y grupo"
          aria-label={`Editar estructura scout de ${member.name || member.cedula}`}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

interface Step2MemberHierarchyModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly member: MemberVerificationResult | null;
  readonly regions?: readonly Region[];
  readonly districts?: readonly District[];
  readonly groups?: readonly ScoutGroup[];
  readonly onSave: (
    cedula: string,
    hierarchy: { region_id?: number; district_id?: number; group_id?: number }
  ) => void;
}

const Step2HierarchyForm: React.FC<{
  readonly member: MemberVerificationResult;
  readonly regions: readonly Region[];
  readonly districts: readonly District[];
  readonly groups: readonly ScoutGroup[];
  readonly onClose: () => void;
  readonly onSave: (
    cedula: string,
    hierarchy: { region_id?: number; district_id?: number; group_id?: number }
  ) => void;
}> = ({ member, regions, districts, groups, onClose, onSave }) => {
  const [selectedRegionId, setSelectedRegionId] = useState<number>(() => member.region_id ?? 0);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number>(() => member.district_id ?? 0);
  const [selectedGroupId, setSelectedGroupId] = useState<number>(() => member.group_id ?? 0);

  const availableDistricts = useMemo(() => {
    if (!selectedRegionId || selectedRegionId === 0) {
      return districts.filter(d => d.id !== 0);
    }
    return districts.filter(d => d.id !== 0 && d.region_id === selectedRegionId);
  }, [districts, selectedRegionId]);

  const availableGroups = useMemo(() => {
    if (!selectedDistrictId || selectedDistrictId === 0) {
      return groups.filter(g => g.id !== 0);
    }
    return groups.filter(g => g.id !== 0 && g.district_id === selectedDistrictId);
  }, [groups, selectedDistrictId]);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave(member.cedula, {
      region_id: selectedRegionId,
      district_id: selectedDistrictId,
      group_id: selectedGroupId
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
      <ModalBody className="space-y-4 font-sans text-neutral">
        <div className="bg-[#faf8f5] p-3 rounded-xl border border-gray-200 text-xs sm:text-sm">
          <p className="font-bold text-neutral">{member.name || 'Miembro'}</p>
          <p className="text-neutral/60 font-mono text-xs">Cédula: {member.cedula}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="step2-member-region-select"
              className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral"
            >
              Región Scout
            </label>
            <select
              id="step2-member-region-select"
              value={selectedRegionId}
              onChange={(e) => {
                const newRegId = Number(e.target.value);
                setSelectedRegionId(newRegId);
                if (newRegId !== 0) {
                  const isValidDistrict = districts.some(
                    d => d.id === selectedDistrictId && d.region_id === newRegId
                  );
                  if (!isValidDistrict) {
                    setSelectedDistrictId(0);
                    setSelectedGroupId(0);
                  }
                }
              }}
              className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value={0}>Sin región / No aplica</option>
              {regions
                .filter(r => r.id !== 0)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="step2-member-district-select"
              className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral"
            >
              Distrito Scout
            </label>
            <select
              id="step2-member-district-select"
              value={selectedDistrictId}
              onChange={(e) => {
                const newDistId = Number(e.target.value);
                setSelectedDistrictId(newDistId);
                if (newDistId !== 0) {
                  const isValidGroup = groups.some(
                    g => g.id === selectedGroupId && g.district_id === newDistId
                  );
                  if (!isValidGroup) {
                    setSelectedGroupId(0);
                  }
                }
              }}
              className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value={0}>Sin distrito / No aplica</option>
              {availableDistricts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="step2-member-group-select"
              className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral"
            >
              Grupo Scout
            </label>
            <select
              id="step2-member-group-select"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(Number(e.target.value))}
              className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value={0}>Sin grupo / No aplica</option>
              {availableGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
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

const Step2MemberHierarchyModal: React.FC<Step2MemberHierarchyModalProps> = ({
  isOpen,
  onClose,
  member,
  regions = [],
  districts = [],
  groups = [],
  onSave
}) => {
  return (
    <Modal isOpen={isOpen && member !== null} onClose={onClose} className="max-w-md">
      <ModalHeader onClose={onClose}>Asignar Estructura Scout</ModalHeader>
      {isOpen && member && (
        <Step2HierarchyForm
          key={member.cedula}
          member={member}
          regions={regions}
          districts={districts}
          groups={groups}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Modal>
  );
};

export type Step2MemberColumnDef = ColumnDef<MemberVerificationResult>;

const createStep2Columns = (
  verifyCedula: (cedula: string, type: 'young' | 'adult', unit?: ScoutUnit) => void,
  handleToggleMemberType: (cedula: string) => void,
  groups?: readonly ScoutGroup[],
  onUpdateMemberGroup?: (cedula: string, groupId: number) => void,
  onOpenHierarchyModal?: (member: MemberVerificationResult) => void
): Step2MemberColumnDef[] => {
  const baseCols: Step2MemberColumnDef[] = [
    {
      accessorKey: 'cedula',
      header: 'Cédula',
      cell: (info) => <CedulaCell value={info.getValue() as string} />
    },
    {
      accessorKey: 'name',
      header: 'Nombre Completo',
      cell: (info) => <NameCell value={info.getValue() as string} />
    }
  ];

  if ((groups && groups.length > 0) || onOpenHierarchyModal) {
    baseCols.push({
      accessorKey: 'group_id',
      header: 'Grupo Scout',
      cell: (info) => (
        <MemberHierarchyCell
          member={info.row.original}
          groups={groups}
          onChangeGroup={(groupId) => onUpdateMemberGroup?.(info.row.original.cedula, groupId)}
          onOpenModal={onOpenHierarchyModal}
        />
      )
    });
  }

  baseCols.push(
    {
      accessorKey: 'status',
      header: 'Estatus',
      cell: (info) => (
        <StatusBadge
          status={info.getValue() as string}
          onRetry={() => {
            if (info.row.original.unit) {
              verifyCedula(info.row.original.cedula, info.row.original.type, info.row.original.unit);
            } else {
              verifyCedula(info.row.original.cedula, info.row.original.type);
            }
          }}
        />
      )
    },
    {
      accessorKey: 'type',
      header: 'Tipo de Miembro',
      cell: (info) => (
        <MemberTypeToggle
          type={info.getValue() as 'young' | 'adult'}
          onToggle={() => handleToggleMemberType(info.row.original.cedula)}
        />
      )
    }
  );

  return baseCols;
};

const sanitizeCedulaInput = (val: string) => val.replace(/[^0-9\n\r]/g, '');

export const Step2Verification: React.FC<Step2VerificationProps> = ({
  batchName,
  youngCedulas,
  setYoungCedulas,
  adultCedulas,
  setAdultCedulas,
  isVerifying,
  verifyProgress,
  verificationList,
  handleVerify,
  verifyCedula,
  handleToggleMemberType,
  handleStep2Continue,
  onBack,
  regions,
  districts,
  groups,
  onUpdateMemberGroup,
  onUpdateMemberHierarchy
}) => {
  const [editingHierarchyMember, setEditingHierarchyMember] = useState<MemberVerificationResult | null>(null);

  const handleOpenHierarchyModal = useCallback((member: MemberVerificationResult) => {
    setEditingHierarchyMember(member);
  }, []);

  const handleSaveHierarchy = useCallback((
    cedula: string,
    hierarchy: { region_id?: number; district_id?: number; group_id?: number }
  ) => {
    if (onUpdateMemberHierarchy) {
      onUpdateMemberHierarchy(cedula, hierarchy);
    } else if (onUpdateMemberGroup && hierarchy.group_id !== undefined) {
      onUpdateMemberGroup(cedula, hierarchy.group_id);
    }
  }, [onUpdateMemberHierarchy, onUpdateMemberGroup]);

  const currentCedulas = useMemo(() => {
    const youngs = youngCedulas.split('\n').map(c => c.trim().replace(/[^0-9]/g, '')).filter(c => c !== '');
    const adults = adultCedulas.split('\n').map(c => c.trim().replace(/[^0-9]/g, '')).filter(c => c !== '');
    return new Set([...youngs, ...adults]);
  }, [youngCedulas, adultCedulas]);

  const filteredVerificationList = useMemo(() => {
    return verificationList.filter(item => currentCedulas.has(item.cedula));
  }, [verificationList, currentCedulas]);

  const canOpenModal = Boolean((regions && regions.length > 0) || onUpdateMemberHierarchy);

  const columns = useMemo(
    () =>
      createStep2Columns(
        verifyCedula,
        handleToggleMemberType,
        groups,
        onUpdateMemberGroup,
        canOpenModal ? handleOpenHierarchyModal : undefined
      ),
    [verifyCedula, handleToggleMemberType, groups, onUpdateMemberGroup, canOpenModal, handleOpenHierarchyModal]
  );

  return (
    <>
      <Card data-walkthrough="wizard-step-container" className="shadow-lg border-primary/10">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <div>
            <div className="text-lg font-bold text-neutral">Verificación de Cédulas</div>
            <p className="text-sm text-neutral/50 font-normal">Lote: {batchName}</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <Field
              label="Cédulas de Jóvenes (Una por línea)"
              placeholder="Ej.&#10;29111222&#10;30444555"
              multiline
              rows={6}
              value={youngCedulas}
              onChange={e => setYoungCedulas(sanitizeCedulaInput(e.target.value))}
              disabled={isVerifying}
            />
            <Field
              label="Cédulas de Adultos (Una por línea)"
              placeholder="Ej.&#10;12333444&#10;15666777"
              multiline
              rows={6}
              value={adultCedulas}
              onChange={e => setAdultCedulas(sanitizeCedulaInput(e.target.value))}
              disabled={isVerifying}
            />
          </div>

          <div className="flex justify-center pt-2">
            <Button
              variant="primary"
              onClick={handleVerify}
              disabled={isVerifying || (!youngCedulas && !adultCedulas)}
              icon={<RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />}
            >
              {isVerifying ? `Verificando (${verifyProgress.current}/${verifyProgress.total})...` : 'Iniciar Verificación'}
            </Button>
          </div>

          {filteredVerificationList.length > 0 && (
            <div className="space-y-4">
              <div className="text-md font-bold text-neutral">Resultados de la Verificación</div>
              <div className="max-h-[354px] overflow-y-auto border border-primary/20 rounded-2xl bg-white shadow-inner">
                <Table 
                  columns={columns} 
                  data={filteredVerificationList} 
                  className="!border-0 !rounded-none" 
                />
              </div>
            </div>
          )}
        </CardBody>
        <CardFooter data-walkthrough="wizard-navigation-buttons">
          <Button
            variant="outline"
            onClick={onBack}
            icon={<ArrowLeft size={18} />}
          >
            Atrás
          </Button>
          <Button
            variant="primary"
            onClick={handleStep2Continue}
            disabled={filteredVerificationList.length === 0 || isVerifying}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Validar y Continuar
          </Button>
        </CardFooter>
      </Card>

      <Step2MemberHierarchyModal
        isOpen={editingHierarchyMember !== null}
        onClose={() => setEditingHierarchyMember(null)}
        member={editingHierarchyMember}
        regions={regions}
        districts={districts}
        groups={groups}
        onSave={handleSaveHierarchy}
      />
    </>
  );
};
