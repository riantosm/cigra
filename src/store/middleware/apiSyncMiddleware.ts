import type { Middleware } from '@reduxjs/toolkit';

import { setUnauthorizedHandler } from '@/services/api/axiosInstance';
import type { AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';

// Menjembatani axiosInstance (401 handler) ke store tanpa axiosInstance perlu import store langsung.
export const apiSyncMiddleware: Middleware = store => {
  // Hanya kalau masih login: 401 dari request yang telat selesai sesudah logout tidak perlu memicu
  // logout (+ POST /auth/logout) lagi.
  setUnauthorizedHandler(() => {
    if (store.getState().auth.isLogin) (store.dispatch as AppDispatch)(logout());
  });

  return next => action => next(action);
};
