export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string;
  tenant_id: number;
  must_change_password: boolean;
  is_active?: number;
  personnel?: unknown;
  family?: unknown;
  roles?: string[];
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
