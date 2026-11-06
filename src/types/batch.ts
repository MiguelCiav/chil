import { ScoutUnit } from './member';

export type BatchUnitScope = 'mixed' | ScoutUnit;

export interface Batch {
  id: number;
  comment?: string;
  region_id: number;
  district_id: number;
  group_id: number;
  unit_scope?: BatchUnitScope;
  recognition_type?: string;
  recognition_duration?: string;
  created_at: string;
  user_id?: string;
}

export interface BatchCreationParams {
  comment?: string;
  region_id: number;
  district_id: number;
  group_id: number;
  unit_scope?: BatchUnitScope;
  recognition_type: string;
  recognition_duration?: string;
  user_id?: string;
}
