import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import axios from 'axios';

import { locationTracking } from '@/native/locationTracking';
import { AUTH_TOKEN_STORAGE_KEY } from '@/utils/constants';

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export async function setAuthToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
  // Foreground service lokasi berjalan native dan tetap hidup walau JS/app di-kill,
  // jadi dia butuh salinan token sendiri di luar AsyncStorage untuk bisa autentikasi upload.
  locationTracking.syncAuthToken(token);
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

// Dipanggil dari store (mis. authSlice) supaya axiosInstance tidak import store langsung (hindari circular import).
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

export const axiosInstance = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 15000,
  // Tanpa header ini backend Laravel me-redirect (302 ke halaman login HTML) alih-alih
  // membalas 401 JSON untuk request yang butuh auth (mis. /auth/me, /auth/logout).
  headers: {
    Accept: 'application/json',
  },
});

axiosInstance.interceptors.request.use(async config => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    // Request logout yang gagal dengan 401 tidak boleh memicu unauthorizedHandler lagi,
    // karena itu akan memanggil logout() -> /auth/logout -> 401 -> logout() tanpa henti.
    const isLogoutRequest = typeof error.config?.url === 'string' && error.config.url.includes('/auth/logout');
    if (error.response?.status === 401 && !isLogoutRequest) {
      await setAuthToken(null);
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);
