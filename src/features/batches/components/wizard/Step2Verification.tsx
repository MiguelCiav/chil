import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, Check, AlertTriangle, AlertCircle, ArrowLeft, ArrowRight, Lock, Settings } from 'lucide-react';
import { Button } from '../../../../components/Button';
import { Field } from '../../../../components/Field';
import { Table } from '../../../../components/Table';
import { Card, CardHeader, CardBody, CardFooter } from '../../../../components/Card';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { MemberVerificationResult, ScoutMember } from '../../types';
import { 
  getMemberStatus, 
  createMember, 
  hasScraperCredentials, 
  loginScraper, 
  getMembersByBatchId, 
  updateMember 
} from '../../api';

interface Step2VerificationProps {
  batchId: number;
  batchName: string;
  onNext: (members: ScoutMember[]) => void;
  onBack: () => void;
}

export const Step2Verification: React.FC<Step2VerificationProps> = ({
  batchId,
  batchName,
  onNext,
  onBack,
}) => {
  const [youngCedulas, setYoungCedulas] = useState('');
  const [adultCedulas, setAdultCedulas] = useState('');
  const [verificationList, setVerificationList] = useState<MemberVerificationResult[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState({ current: 0, total: 0 });

  // Modals for scraper issues
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Toast for network connection errors
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const verifyCedula = async (cedula: string, type: 'young' | 'adult') => {
    // 1. Set to Consultando status
    setVerificationList(prev => {
      const idx = prev.findIndex(item => item.cedula === cedula);
      const newItem: MemberVerificationResult = {
        cedula,
        status: 'Consultando...',
        type
      };
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = newItem;
        return copy;
      } else {
        return [...prev, newItem];
      }
    });

    let scrapedResult = null;
    let scrapeError: Error | null = null;

    try {
      scrapedResult = await getMemberStatus(cedula);
    } catch (err) {
      scrapeError = err instanceof Error ? err : new Error(String(err));
    }

    if (scrapeError) {
      const errStr = scrapeError.message;
      const isUnregistered = errStr.includes("No registrado");
      const status = isUnregistered ? 'No registrado' : 'Error de red';

      setVerificationList(prev => prev.map(item => 
        item.cedula === cedula 
          ? { 
              cedula, 
              name: isUnregistered ? 'Usuario No Registrado' : 'Error de conexión', 
              status, 
              type 
            } 
          : item
      ));

      if (isUnregistered && batchId) {
        try {
          await createMember({
            identity: cedula,
            first_name: 'Usuario',
            last_name: 'No Registrado',
            birth_date: '1990-01-01',
            member_type: type,
            status: 'pending',
            batch_id: batchId
          });
        } catch (dbErr) {
          console.error("Database save failed for unregistered member:", dbErr);
        }
      } else if (!isUnregistered) {
        setToastMessage(`Error de red al verificar la cédula ${cedula}`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
      }
    } else if (scrapedResult) {
      const res = scrapedResult;
      const isScrapedActive = res.status && res.status.toLowerCase() === 'activo';
      const rowStatus = isScrapedActive ? 'Registro válido' : 'No registrado';

      setVerificationList(prev => prev.map(item => 
        item.cedula === cedula 
          ? { 
              cedula, 
              name: res.nombre_completo, 
              status: rowStatus, 
              type, 
              details: res 
            } 
          : item
      ));

      if (batchId) {
        try {
          await createMember({
            identity: cedula,
            first_name: res.nombre_completo.split(' ')[0] || 'Miembro',
            last_name: res.nombre_completo.split(' ').slice(1).join(' ') || 'Scrapeado',
            birth_date: res.fecha_nacimiento || '1990-01-01',
            email: res.correo_electronico,
            phone: res.telefono,
            member_type: type,
            status: isScrapedActive ? 'active' : 'pending',
            batch_id: batchId
          });
        } catch (dbErr) {
          console.error("Database save failed for active/inactive member:", dbErr);
        }
      }
    }

    setVerifyProgress(prev => ({ ...prev, current: prev.current + 1 }));
  };

  const handleVerify = async () => {
    const youngs = youngCedulas.split('\n').map(c => c.trim()).filter(c => c !== '');
    const adults = adultCedulas.split('\n').map(c => c.trim()).filter(c => c !== '');
    const allCedulas = [
      ...youngs.map(c => ({ cedula: c, type: 'young' as const })),
      ...adults.map(c => ({ cedula: c, type: 'adult' as const }))
    ];

    if (allCedulas.length === 0) {
      alert("Ingrese al menos una cédula para verificar.");
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      const hasCreds = await hasScraperCredentials();
      if (!hasCreds) {
        setIsVerifying(false);
        setShowAuthAlert(true);
        return;
      }

      try {
        await loginScraper();
      } catch (loginErr) {
        setIsVerifying(false);
        const errStr = loginErr instanceof Error ? loginErr.message : String(loginErr);
        setAuthError(errStr);
        return;
      }

      setVerifyProgress({ current: 0, total: allCedulas.length });
      const promises = allCedulas.map(item => verifyCedula(item.cedula, item.type));
      await Promise.all(promises);
    } catch (err) {
      console.error("Verification main flow error:", err);
      alert("Hubo un error inesperado al iniciar la verificación.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggleMemberType = async (cedula: string) => {
    const currentItem = verificationList.find(item => item.cedula === cedula);
    if (!currentItem) return;

    const originalType = currentItem.type;
    const nextType = originalType === 'young' ? 'adult' as const : 'young' as const;

    setVerificationList(prev => prev.map(item => 
      item.cedula === cedula ? { ...item, type: nextType } : item
    ));

    if (batchId) {
      try {
        const members = await getMembersByBatchId(batchId);
        const currentMember = members.find(m => m.identity === cedula);
        if (currentMember) {
          currentMember.member_type = nextType;
          await updateMember(currentMember);
        } else {
          throw new Error("Miembro no encontrado en la base de datos.");
        }
      } catch (err) {
        console.error("Error al actualizar tipo de miembro en DB:", err);
        setVerificationList(prev => prev.map(item => 
          item.cedula === cedula ? { ...item, type: originalType } : item
        ));
        alert("No se pudo actualizar el tipo de miembro en la base de datos. Se ha revertido el cambio.");
      }
    }
  };

  const handleStep2Continue = async () => {
    if (batchId) {
      const members = await getMembersByBatchId(batchId);
      onNext(members);
    }
  };

  const columns: ColumnDef<MemberVerificationResult>[] = [
    {
      accessorKey: 'cedula',
      header: 'Cédula',
      cell: (info) => (
        <span className="font-semibold text-neutral">{info.getValue() as string}</span>
      )
    },
    {
      accessorKey: 'name',
      header: 'Nombre Completo',
      cell: (info) => (
        <span className="text-neutral/80">{info.getValue() as string || 'Pendiente...'}</span>
      )
    },
    {
      accessorKey: 'status',
      header: 'Estatus',
      cell: (info) => {
        const val = info.getValue() as string;
        if (val === 'Consultando...') {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 animate-pulse border border-blue-200">
              <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
              Consultando...
            </span>
          );
        } else if (val === 'Registro válido') {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              <Check className="w-3.5 h-3.5 mr-1" />
              Registro válido
            </span>
          );
        } else if (val === 'No registrado') {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              No registrado
            </span>
          );
        } else {
          const rowData = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Error de red
              </span>
              <button 
                onClick={() => verifyCedula(rowData.cedula, rowData.type)}
                className="p-1 hover:bg-primary/10 rounded text-primary transition-colors"
                title="Reintentar verificación"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }
      }
    },
    {
      accessorKey: 'type',
      header: 'Tipo de Miembro',
      cell: (info) => {
        const val = info.getValue() as 'young' | 'adult';
        const rowData = info.row.original;
        return (
          <div className="flex items-center">
            <button
              onClick={() => handleToggleMemberType(rowData.cedula)}
              className={`px-3 py-1 rounded-l-md text-xs font-semibold border border-r-0 transition-colors ${
                val === 'young' 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-white hover:bg-gray-50 border-gray-300 text-neutral'
              }`}
            >
              Joven
            </button>
            <button
              onClick={() => handleToggleMemberType(rowData.cedula)}
              className={`px-3 py-1 rounded-r-md text-xs font-semibold border transition-colors ${
                val === 'adult' 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-white hover:bg-gray-50 border-gray-300 text-neutral'
              }`}
            >
              Adulto
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <Card className="shadow-lg border-primary/10">
      
      {/* Toast Error Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-neutral text-white px-5 py-3 rounded-2xl shadow-xl animate-fade-in border border-primary/20">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

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
            onChange={e => setYoungCedulas(e.target.value)}
            disabled={isVerifying}
          />
          <Field
            label="Cédulas de Adultos (Una por línea)"
            placeholder="Ej.&#10;12333444&#10;15666777"
            multiline
            rows={6}
            value={adultCedulas}
            onChange={e => setAdultCedulas(e.target.value)}
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

        {verificationList.length > 0 && (
          <div className="space-y-4">
            <div className="text-md font-bold text-neutral">Resultados de la Verificación</div>
            <Table columns={columns} data={verificationList} />
          </div>
        )}
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
          onClick={handleStep2Continue}
          disabled={verificationList.length === 0 || isVerifying}
          icon={<ArrowRight size={18} />}
          iconPosition="right"
        >
          Validar y Continuar
        </Button>
      </CardFooter>

      {/* Scraper Authorization Alert Modal */}
      <Modal isOpen={showAuthAlert} onClose={() => setShowAuthAlert(false)} className="max-w-md">
        <ModalHeader onClose={() => setShowAuthAlert(false)}>
          <span className="flex items-center gap-2 text-amber-600 font-bold">
            <AlertTriangle className="w-5 h-5" />
            Autenticación del Scraper Requerida
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4 text-neutral">
          <p className="text-sm leading-relaxed">
            Para verificar el estado de los miembros, se requiere iniciar sesión en el portal de la Asociación de Scouts de Venezuela.
          </p>
          <p className="text-sm font-semibold bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Ingrese sus credenciales de la ASV en el menú de Configuración.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAuthAlert(false)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Scraper Login Failure Error Modal */}
      <Modal isOpen={authError !== null} onClose={() => setAuthError(null)} className="max-w-md">
        <ModalHeader onClose={() => setAuthError(null)}>
          <span className="flex items-center gap-2 text-red-600 font-bold">
            <AlertTriangle className="w-5 h-5" />
            Error de Autenticación del Scraper
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4 text-neutral">
          <p className="text-sm leading-relaxed">
            Falló el inicio de sesión en el portal de la ASV con las credenciales configuradas:
          </p>
          <p className="text-sm font-semibold bg-red-50 text-red-800 p-3 rounded-xl border border-red-200">
            {authError}
          </p>
          <p className="text-xs text-neutral/50">
            Por favor, verifique su usuario y contraseña en el botón <Settings className="inline w-3.5 h-3.5" /> (Ajustes) en la parte superior.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setAuthError(null)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
};
