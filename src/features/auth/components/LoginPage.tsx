import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Button, Field, ErrorAlert } from '../../../components';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, LoginCredentials } from '../types';
import { AuthLayout } from './AuthLayout';
import { PasswordField } from './PasswordField';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [serverError, setServerError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const currentEmail = watch('email');

  // If user is already authenticated, redirect to destination or default /lotes
  if (user) {
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/lotes';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (data: LoginCredentials) => {
    setServerError(null);
    try {
      await login(data);
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/lotes';
      void navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setServerError(msg);
    }
  };

  return (
    <>
      <AuthLayout
        title="Iniciar Sesión"
        subtitle="Sistema de Emisión y Control de Reconocimientos Scouts"
        footerPrompt="¿No tienes una cuenta aún?"
        footerLinkLabel="Regístrate aquí"
        footerLinkTo="/registro"
      >
        {serverError && <ErrorAlert variant="compact" message={serverError} />}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field
            id="login-email"
            label="Correo electrónico"
            type="email"
            placeholder="ejemplo@scouts.org.ve"
            autoComplete="email"
            disabled={isSubmitting}
            variant={errors.email ? 'error' : 'default'}
            errorText={errors.email?.message}
            {...register('email')}
          />

          <PasswordField
            id="login-password"
            label="Contraseña"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isSubmitting}
            errorText={errors.password?.message}
            labelAction={
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-xs text-primary hover:text-primary/80 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                ¿Olvidaste tu contraseña?
              </button>
            }
            {...register('password')}
          />

          <div className="pt-2">
            <Button
              variant="primary"
              type="submit"
              fullWidth
              disabled={isSubmitting}
              icon={<LogIn className="w-4 h-4" />}
              className="py-2.5 text-sm font-bold"
            >
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </div>
        </form>
      </AuthLayout>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        defaultEmail={currentEmail || ''}
      />
    </>
  );
};
