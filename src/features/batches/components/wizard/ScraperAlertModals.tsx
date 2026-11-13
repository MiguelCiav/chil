import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { Button } from '../../../../components/Button';
import { useScraperSettings } from '../../../../context/ScraperSettingsContext';

export interface ScraperAlertModalsProps {
  showAuthAlert: boolean;
  onCloseAuthAlert: () => void;
  authError: string | null;
  onCloseAuthError: () => void;
}

export const ScraperAlertModals: React.FC<ScraperAlertModalsProps> = ({
  showAuthAlert,
  onCloseAuthAlert,
  authError,
  onCloseAuthError
}) => {
  const { openModal } = useScraperSettings();

  return (
    <>
      {/* Scraper Authorization Alert Modal */}
      <Modal isOpen={showAuthAlert} onClose={onCloseAuthAlert} className="max-w-md">
        <ModalHeader onClose={onCloseAuthAlert}>
          <span className="flex items-center gap-2 text-amber-600 font-bold">
            <AlertTriangle className="w-5 h-5" />
            Autenticación del Scraper Requerida
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4 text-neutral">
          <p className="text-sm">
            Para realizar la consulta automatizada en el Registro Nacional de Scouts, primero debe conectar su sesión de Impeesa en los Ajustes del sistema.
          </p>
          <p className="text-xs text-neutral/70 bg-amber-50 border border-amber-100 p-3 rounded-xl font-medium">
            Chil no almacena tu contraseña; solo guarda las cookies de sesión cifradas en el servidor para tus consultas.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onCloseAuthAlert}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onCloseAuthAlert();
              openModal();
            }}
          >
            Configurar Credenciales
          </Button>
        </ModalFooter>
      </Modal>

      {/* Scraper Connection Auth Error Modal */}
      <Modal isOpen={authError !== null} onClose={onCloseAuthError} className="max-w-md">
        <ModalHeader onClose={onCloseAuthError}>
          <span className="flex items-center gap-2 text-red-600 font-bold">
            <AlertCircle className="w-5 h-5" />
            Error de Autenticación
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4 text-neutral">
          <p className="text-sm">
            La sesión con el Sistema de Registro de la ASV expiró o no es válida. Vuelva a conectar su sesión de Impeesa en Ajustes para continuar.
          </p>
          <div className="bg-red-50 text-red-800 text-xs border border-red-100 p-3 rounded-xl max-h-32 overflow-y-auto font-mono">
            {authError}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onCloseAuthError}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onCloseAuthError();
              openModal();
            }}
          >
            Reconectar Sesión
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
