import type { Dispatch, SetStateAction } from 'react';
import { Row, useReactTable } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { Batch } from '../../types';

export type FilterType = 'date' | 'region' | 'district' | 'group' | 'recognition';
export type DateFilterMode = 'predefined' | 'range' | 'specific';
export type PredefinedPeriod = 'this-year' | 'this-month' | 'last-30' | 'last-90';

export interface BatchRowData {
  id: number;
  batch: Batch;
  created_at: string;
  formattedDate: string;
  regionName: string;
  districtName: string;
  groupName: string;
  recognitionName: string;
  recognitionType: string;
  memberCount: number;
}

export interface BatchActionsCellProps {
  row: Row<BatchRowData>;
  table: ReturnType<typeof useReactTable<BatchRowData>>;
  openActionMenuId: number | null;
  setOpenActionMenuId: Dispatch<SetStateAction<number | null>>;
  navigate: ReturnType<typeof useNavigate>;
  handleDownloadPDF: (batchId: number) => void;
  handleDeleteClick: (rowData: BatchRowData) => void;
  downloadingId: number | null;
}

export interface BatchListColumnsParams {
  openActionMenuId: number | null;
  setOpenActionMenuId: Dispatch<SetStateAction<number | null>>;
  navigate: ReturnType<typeof useNavigate>;
  handleDownloadPDF: (batchId: number) => void;
  handleDeleteClick: (rowData: BatchRowData) => void;
  downloadingId: number | null;
}
