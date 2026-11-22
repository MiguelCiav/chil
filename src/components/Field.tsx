import React from 'react';
import { AlertCircle } from 'lucide-react';

type FieldVariant = 'default' | 'error' | 'success';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  multiline?: boolean;
  rows?: number;
  variant?: FieldVariant;
  errorText?: string;
}

export const Field = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, FieldProps>(({
  label,
  multiline = false,
  rows = 4,
  variant = 'default',
  errorText,
  className = '',
  id,
  disabled,
  ...props
}, ref) => {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = variant === 'error';
  const errorId = hasError && errorText ? `${fieldId}-error` : undefined;
  
  // Base styles
  const baseStyles = "w-full rounded-field py-2.5 px-4 transition-all resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:border-transparent";
  
  // Variant styles
  const variants: Record<FieldVariant, string> = {
    default: "bg-primary/5 border border-primary/70 text-neutral placeholder:text-neutral/75 focus-visible:ring-primary",
    error: "bg-red-50 border border-red-600 text-red-900 placeholder:text-red-700/75 focus-visible:ring-red-700",
    success: "bg-green-50 border border-green-700 text-green-900 placeholder:text-green-800/75 focus-visible:ring-green-700"
  };

  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "";

  const classes = [
    baseStyles,
    variants[variant],
    disabledStyles,
    className
  ].join(' ');
  
  return (
    <div className="w-full">
      <label
        htmlFor={fieldId}
        className={`block text-sm font-semibold mb-2 ${hasError ? 'text-red-700' : 'text-neutral'}`}
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

