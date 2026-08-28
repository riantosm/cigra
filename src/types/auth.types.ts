export interface User {
  id: string;
  name: string;
  username: string;
}

export interface AuthState {
  isLogin: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}
