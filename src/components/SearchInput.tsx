import React from 'react';
import { Search, X } from 'lucide-react';

export type SearchInputSize = 'sm' | 'md';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: SearchInputSize;
  onClear?: () => void;
  clearLabel?: string;
}

const SEARCH_INPUT_SIZES: Record<SearchInputSize, { input: string; icon: string }> = {
  sm: {
    input: 'py-2 pl-9 pr-9 text-xs rounded-lg',
    icon: 'w-4 h-4 left-3'
  },
  md: {
    input: 'py-2.5 pl-10 pr-10 text-sm rounded-field',
    icon: 'w-4 h-4 left-3.5'
  }
};

/**
 * Shared search input with leading search icon and optional clear button.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(({
  size = 'sm',
  value,
  onClear,
  clearLabel = 'Limpiar búsqueda',
  className = '',
  disabled,
  ...props
}, ref) => {
  const sizeTokens = SEARCH_INPUT_SIZES[size];
  const hasValue = Boolean(value) && Boolean(onClear);

  return (
    <div className="relative w-full">
      <Search
        className={`absolute top-1/2 -translate-y-1/2 text-neutral/75 pointer-events-none ${sizeTokens.icon}`}
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="text"
        value={value}
        disabled={disabled}
        className={`w-full bg-primary/5 border border-primary/70 text-neutral placeholder:text-neutral/75 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${sizeTokens.input} ${className}`}
        {...props}
      />
      {hasValue && (
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          aria-label={clearLabel}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-neutral/75 hover:text-neutral hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';
