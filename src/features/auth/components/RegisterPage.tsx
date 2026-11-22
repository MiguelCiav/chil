import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Navigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button, Field, ErrorAlert } from '../../../components';
import { useAuth } from '../hooks/useAuth';
import { registerSchema, RegisterCredentials } from '../types';
import { AuthLayout } from './AuthLayout';
import { PasswordField } from './PasswordField';

const getRegistrationErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return 'Error al registrar usuario';
};

export const RegisterPage: React.FC = () => {
  const { user, register: registerUser } = useAuth();
  const navigate = useNavigate();

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterCredentials>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirm_password: ''
    }
  });

  // If user is already authenticated, redirect to /lotes
  if (user) {
    return <Navigate to="/lotes" replace />;
  }

  const onSubmit = async (data: RegisterCredentials) => {
    setServerError(null);
    try {
      await registerUser(data);
      navigate('/lotes', { replace: true });
    } catch (err) {
      setServerError(getRegistrationErrorMessage(err));
    }
  };

  return (
    <AuthLayout
      title="Crear una Cuenta"
      subtitle="Regístrese para gestionar lotes y emitir certificados scouts"
      footerPrompt="¿Ya tienes una cuenta registrada?"
      footerLinkLabel="Inicia sesión aquí"
      footerLinkTo="/login"
    >
      {serverError && <ErrorAlert variant="compact" message={serverError} />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field
          id="register-name"
          label="Nombre y apellido"
          type="text"
          placeholder="Ej. Carlos Mendoza"
          autoComplete="name"
          disabled={isSubmitting}
          variant={errors.full_name ? 'error' : 'default'}
          errorText={errors.full_name?.message}
          {...register('full_name')}
        />

        <Field
          id="register-email"
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
          id="register-password"
          label="Contraseña"
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
          disabled={isSubmitting}
          errorText={errors.password?.message}
          {...register('password')}
        />

        <PasswordField
          id="register-confirm-password"
          label="Confirmar contraseña"
          placeholder="Repita la contraseña"
          autoComplete="new-password"
          disabled={isSubmitting}
          errorText={errors.confirm_password?.message}
          showToggleLabel="Ver confirmar contraseña"
          hideToggleLabel="Ocultar confirmar contraseña"
          {...register('confirm_password')}
        />

        <div className="pt-2">
          <Button
            variant="primary"
            type="submit"
            fullWidth
            disabled={isSubmitting}
            icon={<UserPlus className="w-4 h-4" />}
            className="py-2.5 text-sm font-bold"
          >
            {isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
};
