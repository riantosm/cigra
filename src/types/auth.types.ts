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
  // Diisi dari response login/verifikasi OTP, dan disinkronkan ulang tiap refreshUser() —
  // dipakai RequireGuest/RequireAuth untuk memaksa ke layar ChangePassword sebelum Main.
  requiresPasswordChange: boolean;
  // Token sekali-pakai dari response login pertama — dipakai ChangePassword untuk verifikasi
  // tanpa perlu current_password. Null kalau user harus verifikasi pakai current_password.
  resetToken: string | null;
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
  reset_token: string | null;
  user: AuthUser;
}

export interface OtpRequestPayload {
  login: string;
}

export interface OtpVerifyPayload {
  login: string;
  otp: string;
}

export interface OtpVerifyResult {
  access_token: string;
  requires_password_change: boolean;
  reset_token: string | null;
  user: Pick<AuthUser, 'id' | 'name' | 'username'>;
}

export interface ForgotPasswordPayload {
  login: string;
}

export interface ResetPasswordPayload {
  login: string;
  otp: string;
  password: string;
  password_confirmation: string;
}

export interface SimpleApiMessage {
  success: boolean;
  message: string;
}

export interface ChangePasswordPayload {
  current_password?: string;
  reset_token?: string;
  password: string;
  password_confirmation: string;
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
