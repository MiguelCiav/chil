import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export type ErrorAlertVariant = 'inline' | 'centered' | 'compact';

export interface ErrorAlertProps {
  variant: ErrorAlertVariant;
  message: string;
  title?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Shared accessible `role="alert"` error banner for inline, centered, and modal states.
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  variant,
  message,
  title,
  retryLabel = 'Reintentar',
  onRetry,
  className = ''
}) => {
  if (variant === 'centered') {
    return (
      <div
        role="alert"
        className={`max-w-xl mx-auto my-12 p-8 bg-red-50 border border-red-200 rounded-2xl text-center space-y-4 ${className}`}
      >
        <AlertCircle className="w-10 h-10 text-red-700 mx-auto" aria-hidden="true" />
        {title && (
          <h2 className="text-lg font-bold text-neutral">{title}</h2>
        )}
        <p className="text-xs sm:text-sm text-red-700 font-medium">{message}</p>
        {onRetry && (
          <div className="pt-1 flex justify-center">
            <Button
              variant="primary"
              size="sm"
              onClick={onRetry}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              {retryLabel}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        role="alert"
        className={`p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-red-700 font-medium ${className}`}
      >
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-700 ${className}`}
    >
      <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm font-medium">
        <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          className="shrink-0 self-start sm:self-auto"
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
