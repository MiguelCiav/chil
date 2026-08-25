import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Field } from '../../../components/Field';
import { useAuth } from '../hooks/useAuth';
import { forgotPasswordSchema } from '../types';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

// Inner form component that resets state naturally on mount/unmount
const ForgotPasswordForm: React.FC<{ onClose: () => void; defaultEmail: string }> = ({
  onClose,
  defaultEmail
}) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Correo inválido');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar correo de recuperación';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden min-h-0">
      <ModalHeader onClose={onClose}>
        Recuperar Contraseña
      </ModalHeader>
      <ModalBody className="space-y-4">
        {success ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2 text-center" role="alert">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
            <h3 className="font-bold text-green-800 text-sm">
              ¡Correo de recuperación enviado!
            </h3>
            <p className="text-xs text-green-700">
              Hemos enviado un correo a <span className="font-semibold">{email}</span> con las instrucciones para restablecer su contraseña.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-neutral/70">
              Ingrese la dirección de correo electrónico asociada a su cuenta para recibir un enlace de restablecimiento de contraseña.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium" role="alert">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Field
              label="Correo Electrónico"
              type="email"
              placeholder="ejemplo@scouts.org.ve"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              variant={error ? 'error' : 'default'}
            />
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="outline"
          type="button"
          onClick={onClose}
          disabled={loading}
        >
          {success ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!success && (
          <Button
            variant="primary"
            type="submit"
            disabled={loading || !email.trim()}
            icon={<Mail className="w-4 h-4" />}
          >
            {loading ? 'Enviando...' : 'Enviar Instrucciones'}
          </Button>
        )}
      </ModalFooter>
    </form>
  );
};

// Exported wrapper: Modal conditionally renders the inner form, providing natural state reset
export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = ''
}) => (
  <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
    {isOpen && <ForgotPasswordForm onClose={onClose} defaultEmail={defaultEmail} />}
  </Modal>
);
