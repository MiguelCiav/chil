import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { MemberStatus } from '../../types/member';

export interface MemberStatusBadgeProps {
  readonly status: MemberStatus;
  readonly solventUntil?: string;
  readonly labelOverride?: string;
  readonly className?: string;
}

const STATUS_CONFIG: Record<
  MemberStatus,
  { label: string; classes: string; Icon: React.FC<{ className?: string; 'aria-hidden'?: boolean }> }
> = {
  active: {
    label: 'Registro Válido',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Icon: CheckCircle2
  },
  exceptional: {
    label: 'Emisión Excepcional',
    classes: 'bg-purple-50 text-purple-800 border-purple-200',
    Icon: AlertTriangle
  },
  pending: {
    label: 'Registro Inválido',
    classes: 'bg-rose-50 text-rose-800 border-rose-200',
    Icon: XCircle
  }
};

/**
 * Canonical Scout member validation status pill aligned with `docs/DESIGN.md`.
 */
export const MemberStatusBadge: React.FC<MemberStatusBadgeProps> = ({
  status,
  solventUntil,
  labelOverride,
  className = ''
}) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = config.Icon;

  let displayLabel = config.label;
  if (labelOverride) {
    displayLabel = labelOverride;
  } else if (status === 'active' && solventUntil) {
    displayLabel = `Solvente hasta ${solventUntil}`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.classes} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden={true} />
      {displayLabel}
    </span>
  );
};
