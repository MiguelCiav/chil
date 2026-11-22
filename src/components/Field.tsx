import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export type FieldVariant = 'default' | 'error' | 'success';
export type FieldSize = 'md' | 'sm';

export interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'size'> {
  label: string;
  multiline?: boolean;
  rows?: number;
  variant?: FieldVariant;
  size?: FieldSize;
  errorText?: string;
}

const FIELD_SIZES: Record<FieldSize, { control: string; label: string }> = {
  md: {
    control: 'py-2.5 px-4 text-sm rounded-field',
    label: 'text-sm mb-2'
  },
  sm: {
    control: 'py-2 px-3 text-xs rounded-lg',
    label: 'text-xs mb-1.5'
  }
};

export const Field = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, FieldProps>(({
  label,
  multiline = false,
  rows = 4,
  variant = 'default',
  size = 'md',
  errorText,
  className = '',
  id,
  disabled,
  ...props
}, ref) => {
  const reactUseId = useId();
  const fieldId = id ?? reactUseId;
  const hasError = variant === 'error';
  const errorId = hasError && errorText ? `${fieldId}-error` : undefined;
  const sizeTokens = FIELD_SIZES[size];
  
  // Base styles
  const baseStyles = "w-full transition-all resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:border-transparent";
  
  // Variant styles
  const variants: Record<FieldVariant, string> = {
    default: "bg-primary/5 border border-primary/70 text-neutral placeholder:text-neutral/75 focus-visible:ring-primary",
    error: "bg-red-50 border border-red-600 text-red-900 placeholder:text-red-700/75 focus-visible:ring-red-700",
    success: "bg-green-50 border border-green-700 text-green-900 placeholder:text-green-800/75 focus-visible:ring-green-700"
  };

  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "";

  const classes = [
    baseStyles,
    sizeTokens.control,
    variants[variant],
    disabledStyles,
    className
  ].join(' ');
  
  return (
    <div className="w-full">
      <label
        htmlFor={fieldId}
        className={`block font-semibold ${sizeTokens.label} ${hasError ? 'text-red-700' : 'text-neutral'}`}
      >
        {label}
      </label>
      
      {multiline ? (
        <textarea
          id={fieldId}
          rows={rows}
          className={classes}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={errorId}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={fieldId}
          className={classes}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={errorId}
          ref={ref as React.Ref<HTMLInputElement>}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      
      {errorId && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-700 font-medium flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{errorText}</span>
        </p>
      )}
    </div>
  );
});

Field.displayName = 'Field';

