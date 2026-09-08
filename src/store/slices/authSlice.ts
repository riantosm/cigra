import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

import { getMeApi, loginApi, logoutApi, verifyLoginOtpApi } from '@/services/api/auth.service';
import { setAuthToken } from '@/services/api/axiosInstance';
import type { AuthState, AuthUser, LoginPayload, OtpVerifyPayload, OtpVerifyResult } from '@/types';
import { stopBackgroundLocationTracking } from '@/utils/location';
import { teardownPushNotifications } from '@/utils/pushNotifications';

const initialState: AuthState = {
  isLogin: false,
  user: null,
  token: null,
  isLoading: false,
  error: null,
  requiresPasswordChange: false,
  resetToken: null,
  appChecked: false,
};

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

interface LoginThunkResult {
  user: AuthUser;
  token: string;
  requiresPasswordChange: boolean;
  resetToken: string | null;
}

export const login = createAsyncThunk<LoginThunkResult, LoginPayload, { rejectValue: string }>(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    let result;
    try {
      result = await loginApi(payload);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Login gagal'));
    }

    await setAuthToken(result.access_token);

    // /auth/me lengkap + permintaan izin lokasi + start tracking sengaja TIDAK dilakukan di sini —
    // dulu semuanya di-await sebelum thunk fulfilled, jadi ada jeda beberapa detik antara "API
    // login sukses" dan pindah ke Home. Sekarang layar AppBootstrap yang menanganinya (dengan
    // spinner + tombol "Coba Lagi" kalau izin ditolak); di sini cukup data user dari response login.
    return {
      user: result.user,
      token: result.access_token,
      requiresPasswordChange: result.requires_password_change,
      resetToken: result.reset_token,
    };
  },
);

// RootNavigator, Home, dan Profile masing-masing dispatch refreshUser() independen sebagai
// safety-net sendiri-sendiri (lihat komentar di masing-masing lokasi) — akibatnya beberapa
// dispatch bisa terjadi hampir bersamaan (mis. tepat setelah login: RootNavigator's isLogin
// effect + Home's mount effect keduanya fire). Single-flight + jendela throttle singkat di
// sini menggabungkan dispatch-dispatch yang tumpang tindih itu jadi maksimal satu request
// /auth/me sungguhan, tanpa perlu menghapus safety-net independen di tiap lokasi.
const REFRESH_DEDUPE_WINDOW_MS = 2000;
let inFlightRefresh: Promise<AuthUser> | null = null;
let lastRefreshedAt = 0;

export const refreshUser = createAsyncThunk(
  'auth/refreshUser',
  async () => {
    if (!inFlightRefresh) {
      inFlightRefresh = getMeApi().finally(() => {
        inFlightRefresh = null;
        lastRefreshedAt = Date.now();
      });
    }
    return await inFlightRefresh;
  },
  {
    condition: () => {
      if (inFlightRefresh) return true;
      return Date.now() - lastRefreshedAt >= REFRESH_DEDUPE_WINDOW_MS;
    },
  },
);

function minimalAuthUser(user: OtpVerifyResult['user'], requiresPasswordChange: boolean): AuthUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: '',
    tenant_id: 0,
    must_change_password: requiresPasswordChange,
  };
}

export const loginWithOtp = createAsyncThunk<LoginThunkResult, OtpVerifyPayload, { rejectValue: string }>(
  'auth/loginWithOtp',
  async (payload, { rejectWithValue }) => {
    let result;
    try {
      result = await verifyLoginOtpApi(payload);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Verifikasi OTP gagal'));
    }

    await setAuthToken(result.access_token);

    // Sama seperti thunk `login`: /auth/me lengkap + izin lokasi + start tracking ditangani layar
    // AppBootstrap, bukan di sini. Data user minimal dari response OTP cukup untuk sementara
    // (AppBootstrap akan refreshUser() untuk mengisi role dsb. sebelum Home dirender).
    return {
      user: minimalAuthUser(result.user, result.requires_password_change),
      token: result.access_token,
      requiresPasswordChange: result.requires_password_change,
      resetToken: result.reset_token,
    };
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  // teardownPushNotifications() memanggil DELETE /devices/firebase-token — jalankan selagi token
  // auth masih valid (sebelum logoutApi menginvalidasi sesi & sebelum setAuthToken(null)).
  await teardownPushNotifications();
  try {
    await logoutApi();
  } catch {
    // Token lokal tetap dihapus meski API logout gagal, supaya user selalu bisa keluar.
  } finally {
    await setAuthToken(null);
    await stopBackgroundLocationTracking();
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    logoutLocal(state) {
      state.isLogin = false;
      state.user = null;
      state.token = null;
      state.requiresPasswordChange = false;
      state.resetToken = null;
      state.appChecked = false;
    },
    passwordChanged(state) {
      state.requiresPasswordChange = false;
      state.resetToken = null;
      if (state.user) state.user.must_change_password = false;
    },
    // Dipanggil AppBootstrap setelah /auth/me + izin lokasi + start tracking selesai — melepas
    // gate AppBootstrap sehingga RequireAuth mengizinkan render Main.
    appCheckCompleted(state) {
      state.appChecked = true;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(logout.fulfilled, state => {
        state.isLogin = false;
        state.user = null;
        state.token = null;
        state.requiresPasswordChange = false;
        state.resetToken = null;
        state.appChecked = false;
      })
      .addCase(refreshUser.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.user = action.payload;
        // /auth/me adalah sumber kebenaran yang bertahan lama untuk flag ini (dipanggil ulang di
        // RootNavigator/Home/Profile) — sinkronkan supaya reset password paksa dari admin di
        // tengah sesi juga langsung terdeteksi, bukan cuma sesaat setelah login.
        state.requiresPasswordChange = action.payload.must_change_password;
      })
      .addMatcher(isAnyOf(login.pending, loginWithOtp.pending), state => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(
        isAnyOf(login.fulfilled, loginWithOtp.fulfilled),
        (state, action: PayloadAction<LoginThunkResult>) => {
          state.isLoading = false;
          state.isLogin = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.requiresPasswordChange = action.payload.requiresPasswordChange;
          state.resetToken = action.payload.resetToken;
          // Login baru → wajib lewat AppBootstrap lagi (izin bisa berubah, sesi OTP butuh
          // /auth/me untuk role).
          state.appChecked = false;
        },
      )
      .addMatcher(isAnyOf(login.rejected, loginWithOtp.rejected), (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Login gagal';
      });
  },
});

export const { clearAuthError, logoutLocal, passwordChanged, appCheckCompleted } = authSlice.actions;
export default authSlice.reducer;
