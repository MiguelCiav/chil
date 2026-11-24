import { ColumnDef } from '@tanstack/react-table';
import { Download, Edit2, Eye, MoreVertical, RefreshCw, Trash2 } from 'lucide-react';
import {
  Batch,
  ScoutMember,
  ScoutGroup
} from '../../types';
import { resolveMemberHierarchy } from '../../../../utils/memberHierarchy';
import { getMemberDocId } from '../../utils/memberIdentity';
import { isReverifiableMember } from '../../utils/scraperVerificationPool';
import {
  renderMemberIdentityCell,
  renderMemberNameCell,
  renderMemberUnitCell,
  renderMemberTypeCell,
  renderMemberStatusCell,
  renderMemberCodeCell
} from '../shared/memberColumns';
import { MemberActionsCellProps } from './types';

export {
  renderMemberIdentityCell,
  renderMemberNameCell,
  renderMemberUnitCell,
  renderMemberTypeCell,
  renderMemberStatusCell,
  renderMemberCodeCell
};

export function renderMemberActionsCell(props: MemberActionsCellProps) {
  const {
    row,
    table,
    activeMenuMemberId,
    setActiveMenuMemberId,
    setViewingMember,
    handleEditClick,
    handleDownloadSingleRecognition,
    handleReverifySingleMember,
    handleDeleteMemberClick,
    canDeleteMembers,
    isReverifying
  } = props;
  const rowData = row.original;
  const menuKey = getMemberDocId(rowData);
  const isMenuOpen = activeMenuMemberId === menuKey;
  const totalRows = table.getRowModel().rows.length;
  const isNearBottom =
    (row.index >= totalRows - 2 && totalRows > 1) || (totalRows <= 3 && row.index > 0);
  const dropdownPosition = isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1';
  const canReverify = isReverifiableMember(rowData);
  const deleteDisabled = !canDeleteMembers || isReverifying;

  return (
    <div
      data-walkthrough="batch-detail-table-actions"
      className="flex items-center gap-2 relative"
    >
      {/* Quick View Eye Icon Button */}
      <button
        type="button"
        onClick={() => setViewingMember(rowData)}
        className="p-1.5 text-neutral/75 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
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
          className="p-1.5 text-neutral/75 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus:outline-none"
          aria-label={`Opciones de ${rowData.first_names} ${rowData.last_names}`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {isMenuOpen && (
          <div
            className={`absolute right-0 ${dropdownPosition} w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 font-sans`}
          >
            <button
              type="button"
              disabled={isReverifying}
              onClick={() => {
                setActiveMenuMemberId(null);
                handleEditClick(rowData);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            {canReverify && (
              <button
                type="button"
                disabled={isReverifying}
                onClick={() => {
                  setActiveMenuMemberId(null);
                  handleReverifySingleMember(rowData);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                Re-verificar en Impeesa
              </button>
            )}
            {(rowData.status === 'active' || rowData.status === 'exceptional') && (
              <button
                type="button"
                onClick={() => {
                  setActiveMenuMemberId(null);
                  handleDownloadSingleRecognition(rowData);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                Descargar PDF
              </button>
            )}
            <hr className="my-1 border-gray-100" />
            <button
              type="button"
              disabled={deleteDisabled}
              title={
                !canDeleteMembers
                  ? 'No se puede eliminar el último miembro del lote. Elimina el lote completo si deseas vaciarlo.'
                  : undefined
              }
              onClick={() => {
                setActiveMenuMemberId(null);
                handleDeleteMemberClick(rowData);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              Eliminar miembro
            </button>
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
        const groupId = resolveMemberHierarchy(info.row.original, batch ?? undefined, {
          regions: [],
          districts: [],
          groups
        }).groupId;
        if (groupId === 0) {
          return <span className="text-xs sm:text-sm text-neutral/75 font-medium">No aplica</span>;
        }
        const found = groups.find((g) => g.id === groupId);
        return (
          <span className="text-xs sm:text-sm font-medium text-neutral/80">
            {found?.name ?? `Grupo ${groupId}`}
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
