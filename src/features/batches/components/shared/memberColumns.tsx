import React from 'react';
import { CellContext } from '@tanstack/react-table';
import { MemberStatusBadge } from '../../../../domain/components';
import {
  ScoutMember,
  MemberStatus,
  ScoutUnit,
  getUnitBadge
} from '../../types';

export function renderMemberIdentityCell(info: CellContext<ScoutMember, unknown>): React.ReactNode {
  return (
    <span className="font-mono text-xs sm:text-sm text-neutral/80">
      {info.getValue() as string}
    </span>
  );
}

export function renderMemberNameCell(info: CellContext<ScoutMember, unknown>): React.ReactNode {
  const rowData = info.row.original;
  return (
    <span className="font-bold text-neutral">
      {rowData.first_names} {rowData.last_names}
    </span>
  );
}

export function renderMemberUnitCell(info: CellContext<ScoutMember, unknown>): React.ReactNode {
  const unit = info.getValue() as ScoutUnit | undefined;
  const badge = getUnitBadge(unit);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.badgeClass}`}
    >
      {badge.label}
    </span>
  );
}

export function renderMemberTypeCell(info: CellContext<ScoutMember, unknown>): React.ReactNode {
  const val = info.getValue() as 'young' | 'adult';
  return (
    <span className="text-neutral/75 font-medium text-sm">
      {val === 'young' ? 'Joven' : 'Adulto'}
    </span>
  );
}

export function renderMemberStatusCell(info: CellContext<ScoutMember, unknown>): React.ReactNode {
  const val = info.getValue() as MemberStatus;
  return <MemberStatusBadge status={val} />;
}

export function renderMemberCodeCell(info: CellContext<ScoutMember, unknown>): React.ReactNode {
  const code = info.row.original.recognition_code || (info.getValue() as string) || '-';
  return (
    <span className="font-mono text-xs sm:text-sm font-semibold text-primary">
      {code}
    </span>
  );
}
