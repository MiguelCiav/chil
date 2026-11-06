export interface Region {
  id: number;
  name: string;
  uuid?: string;
}

export interface District {
  id: number;
  name: string;
  region_id: number;
  uuid?: string;
}

export interface ScoutGroup {
  id: number;
  name: string;
  district_id: number;
  uuid?: string;
}
