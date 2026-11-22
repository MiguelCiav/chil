import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export type SelectSize = 'md' | 'sm';
export type SelectVariant = 'default' | 'error';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  size?: SelectSize;
  variant?: SelectVariant;
  errorText?: string;
}

const SELECT_SIZES: Record<SelectSize, { control: string; label: string }> = {
  md: {
    control: 'py-2.5 px-4 text-sm rounded-field',
    label: 'text-sm mb-2'
  },
  sm: {
    control: 'py-2 px-3 text-xs rounded-lg',
    label: 'text-xs mb-1.5'
  }
};

/**
 * Shared accessible native `<select>` primitive supporting `'md'` forms and `'sm'` filter bars.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  size = 'md',
  variant = 'default',
  errorText,
  className = '',
  id,
  disabled,
  children,
  ...props
}, ref) => {
  const reactUseId = useId();
  const selectId = id ?? reactUseId;
  const hasError = variant === 'error';
  const errorId = hasError && errorText ? `${selectId}-error` : undefined;
  const sizeTokens = SELECT_SIZES[size];

  const baseStyles =
    'w-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:border-transparent';

  const variantStyles: Record<SelectVariant, string> = {
    default: 'bg-primary/5 border border-primary/70 text-neutral focus-visible:ring-primary',
    error: 'bg-red-50 border border-red-600 text-red-900 focus-visible:ring-red-700'
  };

  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  const classes = [
    baseStyles,
    sizeTokens.control,
    variantStyles[variant],
    disabledStyles,
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className={`block font-semibold ${sizeTokens.label} ${hasError ? 'text-red-700' : 'text-neutral'}`}
        >
          {label}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        disabled={disabled}
        aria-invalid={hasError ? true : undefined}
        aria-describedby={errorId}
        className={classes}
        {...props}
      >
        {children}
      </select>

      {errorId && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-sm text-red-700 font-medium flex items-center gap-1.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{errorText}</span>
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
