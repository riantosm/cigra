import { axiosInstance } from '@/services/api/axiosInstance';
import type {
  ApiResponse,
  AuthUser,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResult,
  OtpRequestPayload,
  OtpVerifyPayload,
  OtpVerifyResult,
  ResetPasswordPayload,
  SimpleApiMessage,
} from '@/types';

export async function loginApi(payload: LoginPayload): Promise<LoginResult> {
  const { data } = await axiosInstance.post<ApiResponse<LoginResult>>('/auth/login', payload);
  return data.data;
}

export async function logoutApi(): Promise<void> {
  await axiosInstance.post('/auth/logout');
}

export async function getMeApi(): Promise<AuthUser> {
  const { data } = await axiosInstance.get<ApiResponse<AuthUser>>('/auth/me');
  return data.data;
}

export async function requestLoginOtpApi(payload: OtpRequestPayload): Promise<string> {
  const { data } = await axiosInstance.post<SimpleApiMessage>('/auth/otp/request', payload);
  return data.message;
}

export async function verifyLoginOtpApi(payload: OtpVerifyPayload): Promise<OtpVerifyResult> {
  const { data } = await axiosInstance.post<ApiResponse<OtpVerifyResult>>('/auth/otp/verify', payload);
  return data.data;
}

export async function forgotPasswordApi(payload: ForgotPasswordPayload): Promise<string> {
  const { data } = await axiosInstance.post<SimpleApiMessage>('/auth/forgot-password', payload);
  return data.message;
}

export async function resetPasswordApi(payload: ResetPasswordPayload): Promise<string> {
  const { data } = await axiosInstance.post<SimpleApiMessage>('/auth/reset-password', payload);
  return data.message;
}

export async function changePasswordApi(payload: ChangePasswordPayload): Promise<string> {
  const { data } = await axiosInstance.post<SimpleApiMessage>('/auth/change-password', payload);
  return data.message;
}
