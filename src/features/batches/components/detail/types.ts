import type { Dispatch, SetStateAction } from 'react';
import type { Row, Table } from '@tanstack/react-table';
import { ScoutMember } from '../../types';

export interface BatchDetailTotals {
  total: number;
  young: number;
  adult: number;
  valid: number;
  exceptional: number;
  eligible: number;
  pending: number;
}

export interface MemberActionsCellProps {
  row: Row<ScoutMember>;
  table: Table<ScoutMember>;
  activeMenuMemberId: string | null;
  setActiveMenuMemberId: Dispatch<SetStateAction<string | null>>;
  setViewingMember: (member: ScoutMember) => void;
  handleEditClick: (member: ScoutMember) => void;
  handleDownloadSingleRecognition: (member: ScoutMember) => void;
}
