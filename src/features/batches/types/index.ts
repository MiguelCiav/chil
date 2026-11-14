export * from '../../../types';

export interface ActiveFilterChip {
  id: string;
  label: string;
  value: string;
  filterValue?: string;
  type: 'date' | 'region' | 'district' | 'group' | 'unit' | 'recognition' | 'completeness';
}
