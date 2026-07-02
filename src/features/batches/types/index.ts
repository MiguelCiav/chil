export interface Batch {
  id: number;
  comment?: string;
  region_id: number;
  district_id: number;
  group_id: number;
  created_at: string;
}

export interface ScoutMember {
  identity: string;
  first_names: string;
  last_names: string;
  birth_date: string;
  email?: string;
  phone?: string;
  group_id?: number;
  unit_id?: number;
  member_type: 'young' | 'adult'; // "young" (Joven) or "adult" (Adulto)
  status: 'active' | 'pending';   // "active" (Registro válido) or "pending" (No registrado)
  batch_id?: number;
}

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

export interface MemberVerificationResult {
  cedula: string;
  name?: string;
  status: 'Consultando...' | 'Registro válido' | 'No registrado' | 'Error de red';
  type: 'young' | 'adult';
  details?: {
    nombre_completo: string;
    status: string;
    telefono: string;
    correo_electronico: string;
    fecha_nacimiento: string;
  };
}

export interface BatchCreationParams {
  comment?: string;
  region_id: number;
  district_id: number;
  group_id: number;
  recognition_type: string;
}
