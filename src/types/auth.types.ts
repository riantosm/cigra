export interface PersonnelAssignment {
  position?: string;
  unit?: string;
  start_date?: string;
}

export interface Personnel {
  id: number;
  full_name: string;
  service_number: string;
  rank: string;
  birth_place: string;
  birth_date: string;
  birth_date_formatted: string;
  blood_type: string;
  gender: string;
  address: string;
  phone: string;
  photo: string | null;
  status: string;
  current_assignment: PersonnelAssignment | null;
  assignments: unknown[];
}

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string;
  tenant_id: number;
  must_change_password: boolean;
  is_active?: boolean;
  personnel?: Personnel | null;
  family?: unknown;
  roles?: string[];
  permissions?: string[];
}

export interface AuthState {
  isLogin: boolean;
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginPayload {
  login: string;
  password: string;
}

export interface LoginResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  requires_password_change: boolean;
  reset_token: string;
  user: AuthUser;
}

export interface RefreshTokenResult {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
