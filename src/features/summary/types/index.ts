import { ScoutUnit } from '../../batches/types';

export interface SummaryRowData {
  id: string; // member identity + batch id
  issueDate: string; // Formatted date
  rawDate: string; // ISO date for sorting
  batchId: number;
  batchCode: string; // LT-2026-001 or #001
  recognitionId: string;
  recognitionName: string;
  identity: string; // C.I.
  firstName: string;
  lastName: string;
  fullName: string;
  unit?: ScoutUnit;
  unitLabel: string;
  memberType: 'young' | 'adult';
  memberTypeLabel: 'Joven' | 'Adulto';
  status: 'active' | 'pending' | 'exceptional';
  statusLabel: 'Registro Válido' | 'Registro Inválido' | 'Emisión Excepcional';
  exceptionalReason?: string;
  recognitionCode: string;
  regionName: string;
  districtName: string;
  groupName: string;
}

export interface SummaryFilterState {
  search: string;
  recognitionType: string;
  regionId: string;
  districtId: string;
  groupId: string;
  unit?: string;
  memberType: 'all' | 'young' | 'adult';
  status: 'all' | 'active' | 'pending' | 'exceptional';
  datePeriod: 'all' | 'this-year' | 'this-month' | 'last-30' | 'last-90' | 'custom';
  startDate: string;
  endDate: string;
}
