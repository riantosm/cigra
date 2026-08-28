import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

import { getMeApi, loginApi, logoutApi } from '@/services/api/auth.service';
import { setAuthToken } from '@/services/api/axiosInstance';
import type { AuthState, AuthUser, LoginPayload } from '@/types';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '@/utils/location';

const initialState: AuthState = {
  isLogin: false,
  user: null,
  token: null,
  isLoading: false,
  error: null,
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

    let user: AuthUser = result.user;
    try {
      user = await getMeApi();
    } catch {
      // /auth/me gagal diambil — tetap lanjut pakai data user dari response login.
    }

    try {
      await startBackgroundLocationTracking();
    } catch {
      // Izin lokasi latar belakang gagal/ditolak — tidak menggagalkan login, tracking cukup
      // dicoba lagi nanti (mis. dari layar Profile) daripada memblokir user masuk aplikasi.
    }

    return { user, token: result.access_token };
  },
);

export const refreshUser = createAsyncThunk('auth/refreshUser', async () => {
  return await getMeApi();
});

export const logout = createAsyncThunk('auth/logout', async () => {
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
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<LoginThunkResult>) => {
        state.isLoading = false;
        state.isLogin = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Login gagal';
      })
      .addCase(logout.fulfilled, state => {
        state.isLogin = false;
        state.user = null;
        state.token = null;
      })
      .addCase(refreshUser.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.user = action.payload;
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
