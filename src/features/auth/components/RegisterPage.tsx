import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, AlertCircle } from 'lucide-react';
import logo from '../../../assets/CHIL_LOGO.png';
import { Button } from '../../../components/Button';
import { useAuth } from '../hooks/useAuth';
import { registerSchema, RegisterCredentials } from '../types';

export const RegisterPage: React.FC = () => {
  const { user, register: registerUser } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      const msg = err instanceof Error ? err.message : 'Error al registrar usuario';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col justify-center items-center py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-2">
            <img src={logo} alt="Chil Logo" className="h-12 w-auto" />
            <span className="text-2xl font-black text-primary tracking-tight">Chil</span>
          </div>
          <h2 className="text-xl font-bold text-neutral">
            Crear una Cuenta
          </h2>
          <p className="text-xs text-neutral/70">
            Regístrese para gestionar lotes y emitir certificados scouts
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {serverError && (
            <div
              className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 font-medium"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Full Name Field */}
            <div className="w-full">
              <label
                htmlFor="register-name"
                className={`block uppercase text-xs font-bold mb-1.5 tracking-wider ${
                  errors.full_name ? 'text-red-600' : 'text-neutral/70'
                }`}
              >
                Nombre y Apellido
              </label>
              <input
                id="register-name"
                type="text"
                placeholder="Ej. Carlos Mendoza"
                autoComplete="name"
                disabled={isSubmitting}
                className={`w-full rounded-xl py-2.5 px-4 text-sm transition-all focus:outline-none focus:ring-2 focus:border-transparent ${
                  errors.full_name
                    ? 'bg-red-50 border border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500'
                    : 'bg-primary/5 border border-primary/20 text-neutral placeholder-primary/40 focus:ring-primary'
                }`}
                {...register('full_name')}
              />
              {errors.full_name && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="w-full">
              <label
                htmlFor="register-email"
                className={`block uppercase text-xs font-bold mb-1.5 tracking-wider ${
                  errors.email ? 'text-red-600' : 'text-neutral/70'
                }`}
              >
                Correo Electrónico
              </label>
              <input
                id="register-email"
                type="email"
                placeholder="ejemplo@scouts.org.ve"
                autoComplete="email"
                disabled={isSubmitting}
                className={`w-full rounded-xl py-2.5 px-4 text-sm transition-all focus:outline-none focus:ring-2 focus:border-transparent ${
                  errors.email
                    ? 'bg-red-50 border border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500'
                    : 'bg-primary/5 border border-primary/20 text-neutral placeholder-primary/40 focus:ring-primary'
                }`}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="w-full">
              <label
                htmlFor="register-password"
                className={`block uppercase text-xs font-bold mb-1.5 tracking-wider ${
                  errors.password ? 'text-red-600' : 'text-neutral/70'
                }`}
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  className={`w-full rounded-xl py-2.5 pl-4 pr-11 text-sm transition-all focus:outline-none focus:ring-2 focus:border-transparent ${
                    errors.password
                      ? 'bg-red-50 border border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500'
                      : 'bg-primary/5 border border-primary/20 text-neutral placeholder-primary/40 focus:ring-primary'
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral/50 hover:text-neutral transition-colors p-1"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="w-full">
              <label
                htmlFor="register-confirm-password"
                className={`block uppercase text-xs font-bold mb-1.5 tracking-wider ${
                  errors.confirm_password ? 'text-red-600' : 'text-neutral/70'
                }`}
              >
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repita la contraseña"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  className={`w-full rounded-xl py-2.5 pl-4 pr-11 text-sm transition-all focus:outline-none focus:ring-2 focus:border-transparent ${
                    errors.confirm_password
                      ? 'bg-red-50 border border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500'
                      : 'bg-primary/5 border border-primary/20 text-neutral placeholder-primary/40 focus:ring-primary'
                  }`}
                  {...register('confirm_password')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral/50 hover:text-neutral transition-colors p-1"
                  aria-label={showConfirmPassword ? 'Ocultar confirmar contraseña' : 'Ver confirmar contraseña'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.confirm_password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                type="submit"
                fullWidth
                disabled={isSubmitting}
                icon={<UserPlus className="w-4 h-4" />}
                className="py-2.5 text-sm font-bold shadow-sm"
              >
                {isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta'}
              </Button>
            </div>
          </form>

          {/* Login Footer Link */}
          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-xs text-neutral/70">
              ¿Ya tienes una cuenta registrada?{' '}
              <Link
                to="/login"
                className="font-bold text-primary hover:text-primary/80 transition-colors"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
