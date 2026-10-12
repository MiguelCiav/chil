export interface Region {
  id: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
  region_id: number;
}

export interface ScoutGroup {
  id: number;
  name: string;
  district_id: number;
}
