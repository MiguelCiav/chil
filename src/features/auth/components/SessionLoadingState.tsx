import React from 'react';

export interface SessionLoadingStateProps {
  label?: string;
}

/**
 * Shared accessible spinner state while Firebase session initialization resolves.
 */
export const SessionLoadingState: React.FC<SessionLoadingStateProps> = ({
  label = 'Cargando sesión'
}) => (
  <output
    className="min-h-[50vh] flex flex-col items-center justify-center space-y-3"
    aria-live="polite"
    aria-label={label}
  >
    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
    <span className="text-xs font-semibold text-neutral/75">Verificando sesión...</span>
  </output>
);
