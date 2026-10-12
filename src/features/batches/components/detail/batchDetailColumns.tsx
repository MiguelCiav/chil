import React from 'react';
import { ColumnDef, CellContext } from '@tanstack/react-table';
import { Award, Edit2, Eye, MoreVertical } from 'lucide-react';
import {
  Batch,
  ScoutMember,
  ScoutGroup,
  MemberStatus,
  ScoutUnit,
  getUnitBadge
} from '../../types';
import { MemberActionsCellProps } from './types';

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
    <span className="text-neutral/70 font-medium text-sm">
      {val === 'young' ? 'Joven' : 'Adulto'}
    </span>
  );
}

export function renderMemberStatusCell(info: CellContext<ScoutMember, unknown>): React.ReactNode {
  const val = info.getValue() as MemberStatus;
  if (val === 'active') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f7eb] text-[#1b7a37] border border-[#c3eed0]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#1b7a37] mr-1.5 inline-block" />
        <span>Registro Válido</span>
      </span>
    );
  }
  if (val === 'exceptional') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#f3e8ff] text-[#7e22ce] border border-[#e9d5ff]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7e22ce] mr-1.5 inline-block" />
        <span>Emisión Excepcional</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#feeae8] text-[#c92a2a] border border-[#fccfca]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#c92a2a] mr-1.5 inline-block" />
      <span>Registro Inválido</span>
    </span>
  );
}

export function renderMemberCodeCell(info: CellContext<ScoutMember, unknown>): React.ReactNode {
  const rowData = info.row.original;
  const code =
    (info.getValue() as string) ||
    (rowData.status === 'active' || rowData.status === 'exceptional'
      ? `REC-${rowData.identity.slice(-4)}`
      : '-');
  return <span className="font-mono text-xs sm:text-sm text-neutral/70">{code}</span>;
}

export function renderMemberActionsCell(props: MemberActionsCellProps) {
  const {
    row,
    table,
    activeMenuMemberId,
    setActiveMenuMemberId,
    setViewingMember,
    handleEditClick,
    handleDownloadSingleRecognition
  } = props;
  const rowData = row.original;
  const menuKey = rowData.recognition_code || rowData.identity;
  const isMenuOpen = activeMenuMemberId === menuKey;
  const totalRows = table.getRowModel().rows.length;
  const isNearBottom =
    (row.index >= totalRows - 2 && totalRows > 1) || (totalRows <= 3 && row.index > 0);
  const dropdownPosition = isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1';

  return (
    <div
      data-walkthrough="batch-detail-table-actions"
      className="flex items-center gap-2 relative"
    >
      {/* Quick View Eye Icon Button */}
      <button
        type="button"
        onClick={() => setViewingMember(rowData)}
        className="p-1.5 text-neutral/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
        title="Ver detalle del miembro"
        aria-label={`Ver detalle de ${rowData.first_names} ${rowData.last_names}`}
      >
        <Eye className="w-4 h-4" />
      </button>

      {/* Actions 3-Dots Menu */}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setActiveMenuMemberId(isMenuOpen ? null : menuKey)}
          className="p-1.5 text-neutral/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus:outline-none"
          aria-label={`Opciones de ${rowData.first_names} ${rowData.last_names}`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {isMenuOpen && (
          <div
            className={`absolute right-0 ${dropdownPosition} w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 font-sans`}
          >
            <button
              type="button"
              onClick={() => handleEditClick(rowData)}
              className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 flex items-center gap-2"
            >
              <Edit2 className="w-3.5 h-3.5 text-primary" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMenuMemberId(null);
                setViewingMember(rowData);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 flex items-center gap-2"
            >
              <Eye className="w-3.5 h-3.5 text-primary" />
              Ver Ficha
            </button>
            {(rowData.status === 'active' || rowData.status === 'exceptional') && (
              <button
                type="button"
                onClick={() => handleDownloadSingleRecognition(rowData)}
                className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 flex items-center gap-2"
              >
                <Award className="w-3.5 h-3.5 text-primary" />
                Descargar Reconocimiento (PDF)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function createBatchDetailColumns(
  actionsProps: Omit<MemberActionsCellProps, 'row' | 'table'>,
  groups: ScoutGroup[],
  batch: Batch | null
): ColumnDef<ScoutMember>[] {
  return [
    {
      accessorKey: 'identity',
      header: 'CÉDULA',
      cell: renderMemberIdentityCell
    },
    {
      accessorKey: 'name',
      header: 'NOMBRE',
      cell: renderMemberNameCell
    },
    {
      id: 'group',
      header: 'GRUPO',
      cell: (info) => {
        const memberGroupId = info.row.original.group_id ?? batch?.group_id;
        if (!memberGroupId || memberGroupId === 0) {
          return <span className="text-xs sm:text-sm text-neutral/50 font-medium">No aplica</span>;
        }
        const found = groups.find((g) => g.id === memberGroupId);
        return (
          <span className="text-xs sm:text-sm font-medium text-neutral/80">
            {found?.name ?? `Grupo ${memberGroupId}`}
          </span>
        );
      }
    },
    {
      accessorKey: 'unit',
      header: 'UNIDAD',
      cell: renderMemberUnitCell
    },
    {
      accessorKey: 'member_type',
      header: 'TIPO',
      cell: renderMemberTypeCell
    },
    {
      accessorKey: 'status',
      header: 'ESTATUS',
      cell: renderMemberStatusCell
    },
    {
      accessorKey: 'recognition_code',
      header: 'CÓDIGO REC.',
      cell: renderMemberCodeCell
    },
    {
      id: 'actions',
      header: 'ACCIONES',
      cell: ({ row, table }) =>
        renderMemberActionsCell({
          row,
          table,
          ...actionsProps
        })
    }
  ];
}
