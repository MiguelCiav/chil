import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import logo from '../../../assets/CHIL_LOGO.png';
import { Button } from '../../../components/Button';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, LoginCredentials } from '../types';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
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
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
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
            Iniciar Sesión
          </h2>
          <p className="text-xs text-neutral/70">
            Sistema de Emisión y Control de Reconocimientos Scouts
          </p>
        </div>

        {/* Login Card */}
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
            {/* Email Field */}
            <div className="w-full">
              <label
                htmlFor="login-email"
                className={`block uppercase text-xs font-bold mb-1.5 tracking-wider ${
                  errors.email ? 'text-red-600' : 'text-neutral/70'
                }`}
              >
                Correo Electrónico
              </label>
              <input
                id="login-email"
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
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className={`block uppercase text-xs font-bold tracking-wider ${
                    errors.password ? 'text-red-600' : 'text-neutral/70'
                  }`}
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-xs text-primary hover:text-primary/80 font-semibold focus:outline-none"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
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

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                type="submit"
                fullWidth
                disabled={isSubmitting}
                icon={<LogIn className="w-4 h-4" />}
                className="py-2.5 text-sm font-bold shadow-sm"
              >
                {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </div>
          </form>

          {/* Registration Footer Link */}
          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-xs text-neutral/70">
              ¿No tienes una cuenta aún?{' '}
              <Link
                to="/registro"
                className="font-bold text-primary hover:text-primary/80 transition-colors"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        defaultEmail={currentEmail || ''}
      />
    </div>
  );
};
