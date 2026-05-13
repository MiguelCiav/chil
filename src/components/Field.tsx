import React from 'react';

type FieldVariant = 'default' | 'error' | 'success';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  multiline?: boolean;
  rows?: number;
  variant?: FieldVariant;
  errorText?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  multiline = false,
  rows = 4,
  variant = 'default',
  errorText,
  className = '',
  id,
  disabled,
  ...props
}) => {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  // Base styles
  const baseStyles = "w-full rounded-field p-4 transition-all resize-none focus:outline-none focus:ring-2 focus:border-transparent";
  
  // Variant styles
  const variants: Record<FieldVariant, string> = {
    default: "bg-primary/5 border border-primary/20 text-neutral placeholder-primary/40 focus:ring-primary",
    error: "bg-red-50 border border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500",
    success: "bg-green-50 border border-green-300 text-green-900 placeholder-green-300 focus:ring-green-500"
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
        className={`block uppercase text-sm font-semibold mb-2 tracking-wide ${variant === 'error' ? 'text-red-500' : 'text-neutral'}`}
      >
        {label}
      </label>
      
      {multiline ? (
        <textarea
          id={fieldId}
          rows={rows}
          className={classes}
          disabled={disabled}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={fieldId}
          className={classes}
          disabled={disabled}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      
      {variant === 'error' && errorText && (
        <p className="mt-1.5 text-sm text-red-500 font-medium">{errorText}</p>
      )}
    </div>
  );
};
