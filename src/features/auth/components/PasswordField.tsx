import React, { useId, useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  labelAction?: React.ReactNode;
  errorText?: string;
  showToggleLabel?: string;
  hideToggleLabel?: string;
}

/**
 * Feature-local password input aligned with canonical `Field` tokens and an integrated visibility toggle.
 */
export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(({
  label,
  labelAction,
  errorText,
  showToggleLabel = 'Ver contraseña',
  hideToggleLabel = 'Ocultar contraseña',
  className = '',
  id,
  disabled,
  ...props
}, ref) => {
  const [visible, setVisible] = useState(false);
  const reactUseId = useId();
  const fieldId = id ?? reactUseId;
  const hasError = Boolean(errorText);
  const errorId = hasError ? `${fieldId}-error` : undefined;

  const inputStateClasses = hasError
    ? 'bg-red-50 border border-red-600 text-red-900 placeholder:text-red-700/75 focus-visible:ring-red-700'
    : 'bg-primary/5 border border-primary/70 text-neutral placeholder:text-neutral/75 focus-visible:ring-primary';

  const classes = [
    'w-full rounded-field py-2.5 pl-4 pr-11 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:border-transparent',
    inputStateClasses,
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    className
  ].join(' ');

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor={fieldId}
          className={`block text-sm font-semibold ${hasError ? 'text-red-700' : 'text-neutral'}`}
        >
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={errorId}
          ref={ref}
          className={classes}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible(prev => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral/75 hover:text-neutral transition-colors p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          aria-label={visible ? hideToggleLabel : showToggleLabel}
        >
          {visible ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {errorId && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-700 font-medium flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{errorText}</span>
        </p>
      )}
    </div>
  );
});

PasswordField.displayName = 'PasswordField';
