import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, Check, AlertTriangle, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../../../../components/Card';
import { Button } from '../../../../components/Button';
import { Field } from '../../../../components/Field';
import { Table } from '../../../../components/Table';
import { MemberVerificationResult, ScoutUnit } from '../../types';

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

export type Step2MemberColumnDef = ColumnDef<MemberVerificationResult>;

const createStep2Columns = (
  verifyCedula: (cedula: string, type: 'young' | 'adult', unit?: ScoutUnit) => void,
  handleToggleMemberType: (cedula: string) => void
): Step2MemberColumnDef[] => [
  {
    accessorKey: 'cedula',
    header: 'Cédula',
    cell: (info) => <CedulaCell value={info.getValue() as string} />
  },
  {
    accessorKey: 'name',
    header: 'Nombre Completo',
    cell: (info) => <NameCell value={info.getValue() as string} />
  },
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
];

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
  onBack
}) => {
  const currentCedulas = React.useMemo(() => {
    const youngs = youngCedulas.split('\n').map(c => c.trim().replace(/[^0-9]/g, '')).filter(c => c !== '');
    const adults = adultCedulas.split('\n').map(c => c.trim().replace(/[^0-9]/g, '')).filter(c => c !== '');
    return new Set([...youngs, ...adults]);
  }, [youngCedulas, adultCedulas]);

  const filteredVerificationList = React.useMemo(() => {
    return verificationList.filter(item => currentCedulas.has(item.cedula));
  }, [verificationList, currentCedulas]);

  const columns = React.useMemo(
    () => createStep2Columns(verifyCedula, handleToggleMemberType),
    [verifyCedula, handleToggleMemberType]
  );

  return (
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
  );
};
