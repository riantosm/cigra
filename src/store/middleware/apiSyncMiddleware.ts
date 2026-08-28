import type { Middleware } from '@reduxjs/toolkit';

import { setUnauthorizedHandler } from '@/services/api/axiosInstance';
import type { AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';

// Menjembatani axiosInstance (401 handler) ke store tanpa axiosInstance perlu import store langsung.
export const apiSyncMiddleware: Middleware = store => {
  setUnauthorizedHandler(() => (store.dispatch as AppDispatch)(logout()));

  return next => action => next(action);
};
