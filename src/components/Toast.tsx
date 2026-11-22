import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

export type ToastVariant = 'success' | 'warning' | 'error';

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { container: string; icon: React.ReactNode; role: 'status' | 'alert'; ariaLive: 'polite' | 'assertive' }
> = {
  success: {
    container: 'bg-neutral text-white border-primary/20',
    icon: <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" aria-hidden="true" />,
    role: 'status',
    ariaLive: 'polite'
  },
  warning: {
    container: 'bg-amber-900 text-white border-amber-600',
    icon: <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0" aria-hidden="true" />,
    role: 'alert',
    ariaLive: 'assertive'
  },
  error: {
    container: 'bg-red-900 text-white border-red-700',
    icon: <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" aria-hidden="true" />,
    role: 'alert',
    ariaLive: 'assertive'
  }
};

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'success',
  onDismiss,
  className = ''
}) => {
  const style = VARIANT_STYLES[variant];

  return (
    <div
      role={style.role}
      aria-live={style.ariaLive}
      className={`fixed top-6 right-6 z-50 max-w-md flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-fade-in ${style.container} ${className}`}
    >
      {style.icon}
      <span className="text-sm font-semibold">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar notificación"
          className="ml-1 p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
