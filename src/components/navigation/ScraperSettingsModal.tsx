import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Lock,
} from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../Modal';
import { Button } from '../Button';
import { Field } from '../Field';
import { useScraperSettings } from '../../context/ScraperSettingsContext';
import {
  saveScraperSession,
  clearScraperSession,
} from '../../features/batches/api';

export const ScraperSettingsModal: React.FC = () => {
  const {
    isOpen,
    closeModal,
    sessionStatus,
    isLoadingStatus,
    setSessionStatus,
  } = useScraperSettings();

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevSessionEmail, setPrevSessionEmail] = useState<string | null>(
    sessionStatus?.impeesaEmail ?? null
  );
  const [email, setEmail] = useState(sessionStatus?.impeesaEmail || '');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setEmail(sessionStatus?.impeesaEmail || '');
      setPassword('');
      setSuccessMsg('');
      setErrorMsg('');
    }
  }

  const currentSessionEmail = sessionStatus?.impeesaEmail ?? null;
  if (currentSessionEmail !== prevSessionEmail) {
    setPrevSessionEmail(currentSessionEmail);
    if (isOpen && currentSessionEmail) {
      setEmail(currentSessionEmail);
    }
  }

  const handleClose = () => {
    setPassword('');
    setSuccessMsg('');
    setErrorMsg('');
    closeModal();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('Por favor ingresa ambos campos.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedStatus = await saveScraperSession({
        email: trimmedEmail,
        password,
      });
      setSessionStatus(updatedStatus);
      setPassword('');
      setSuccessMsg(
        '¡Sesión de Impeesa conectada y guardada de forma segura!'
      );
    } catch (error: unknown) {
      const msg =
        error instanceof Error && error.message
          ? error.message
          : 'No se pudo iniciar sesión en Sistema de Registro. Verifica tus credenciales.';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsDisconnecting(true);
    try {
      const cleared = await clearScraperSession();
      setSessionStatus(cleared);
      setPassword('');
      setEmail('');
      setSuccessMsg('Sesión de Impeesa desconectada correctamente.');
    } catch (error: unknown) {
      const msg =
        error instanceof Error && error.message
          ? error.message
          : 'No se pudo desconectar la sesión.';
      setErrorMsg(msg);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const status = sessionStatus?.status || 'none';
  const hasStoredSession =
    status === 'active' || status === 'expired' || Boolean(sessionStatus?.connected);
  const isBusy = isSaving || isDisconnecting;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md">
      <form
        onSubmit={handleSave}
        className="flex flex-col flex-1 overflow-hidden min-h-0"
      >
        <ModalHeader onClose={handleClose}>
          Conexión con Sistema de Registro (Impeesa)
        </ModalHeader>

        <ModalBody className="space-y-4">
          {/* Security Notice */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Tus credenciales están protegidas</span>
            </div>
            <p className="text-xs text-neutral/75 leading-relaxed">
              Chil utiliza tu correo y contraseña{' '}
              <strong>una sola vez</strong> para iniciar sesión en{' '}
              <span className="font-mono">registro.scouts.org.ve</span> y{' '}
              <strong>nunca guarda ni registra tu contraseña</strong> en base
              de datos ni en tu navegador.
            </p>
            <p className="text-xs text-neutral/70 leading-relaxed flex items-start gap-1.5 pt-0.5">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/70" />
              <span>
                Solo conservamos las cookies de sesión cifradas en el servidor
                (AES-256-GCM, vinculadas a tu usuario e inaccesibles desde el
                cliente) para evitar que tengas que ingresar tu clave cada vez
                que abras Chil.
              </span>
            </p>
          </div>

          {/* Current Session Status */}
          {isLoadingStatus ? (
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-neutral/60">
              Verificando estado de sesión...
            </div>
          ) : status === 'active' ? (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs text-emerald-900 truncate">
                  <span className="font-semibold">Sesión activa</span>
                  {sessionStatus?.impeesaEmail && (
                    <span className="block text-emerald-700 truncate">
                      {sessionStatus.impeesaEmail}
                    </span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={isBusy}
                icon={<LogOut className="w-3.5 h-3.5" />}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
              >
                {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
              </Button>
            </div>
          ) : status === 'expired' ? (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="text-xs text-amber-900">
                  <span className="font-semibold">Sesión expirada</span>
                  <span className="block text-amber-800">
                    Ingresa tus credenciales nuevamente para renovarla.
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={isBusy}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
              >
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-neutral/70">
              No hay ninguna sesión de Impeesa conectada actualmente.
            </div>
          )}

          <Field
            label="Correo de Impeesa"
            id="field-scraper-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@scouts.org.ve"
            autoComplete="email"
            disabled={isBusy}
            required
          />

          <Field
            label="Contraseña"
            id="field-scraper-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isBusy}
            required
          />

          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
              {successMsg}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isBusy}
          >
            Cerrar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isBusy}
          >
            {isSaving
              ? 'Verificando...'
              : hasStoredSession
                ? 'Actualizar Sesión'
                : 'Conectar Sesión'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
