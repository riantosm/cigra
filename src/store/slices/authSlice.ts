import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { setAuthToken } from '@/services/api/axiosInstance';
import type { AuthState, LoginPayload, LoginResponse } from '@/types';
import { MOCK_CREDENTIALS } from '@/utils/constants';

const initialState: AuthState = {
  isLogin: false,
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

// Backend belum tersedia, jadi login di-mock lokal (admin/admin).
// Begitu API auth siap, ganti body thunk ini dengan `await loginApi(payload)` dari auth.service.ts.
export const login = createAsyncThunk<LoginResponse, LoginPayload, { rejectValue: string }>(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    await new Promise<void>(resolve => setTimeout(() => resolve(), 600));

    if (
      payload.username !== MOCK_CREDENTIALS.username ||
      payload.password !== MOCK_CREDENTIALS.password
    ) {
      return rejectWithValue('Username atau password salah');
    }

    const response: LoginResponse = {
      user: { id: '1', name: 'Admin', username: payload.username },
      token: 'mock-token',
    };
    await setAuthToken(response.token);
    return response;
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await setAuthToken(null);
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
      .addCase(login.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
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
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
