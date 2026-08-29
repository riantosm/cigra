import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

import { locationTracking } from '@/native/locationTracking';
import { AUTH_TOKEN_STORAGE_KEY } from '@/utils/constants';
import type { ApiResponse, RefreshTokenResult } from '@/types';

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

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Token lama otomatis dinonaktifkan begitu refresh sukses (rotating token), jadi beberapa request
// yang 401 hampir bersamaan harus menunggu SATU refresh yang sama alih-alih masing-masing memicu
// refresh sendiri — kalau tidak, refresh kedua akan gagal karena token yang dipakainya sudah
// dianulir oleh refresh pertama.
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const oldToken = await getAuthToken();
  if (!oldToken) return null;

  try {
    // Tidak set header Authorization manual — request interceptor di atas otomatis menempelkan
    // oldToken dari AsyncStorage (belum dihapus di titik ini), sesuai kontrak backend: refresh
    // pakai access token lama sebagai Bearer, tanpa body.
    const { data } = await axiosInstance.post<ApiResponse<RefreshTokenResult>>('/auth/refresh');
    if (!data.success || !data.data?.access_token) return null;
    await setAuthToken(data.data.access_token);
    return data.data.access_token;
  } catch {
    return null;
  }
}

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const url = typeof error.config?.url === 'string' ? error.config.url : '';
    // /auth/login: kredensial salah tidak boleh memicu alur refresh/logout ini (user belum login).
    // /auth/logout: 401 di sini tidak boleh memicu logout() lagi -> /auth/logout -> 401 -> loop.
    // /auth/refresh: kegagalannya ditangani langsung oleh performRefresh, bukan lewat interceptor ini.
    const isAuthLifecycleRequest =
      url.includes('/auth/login') || url.includes('/auth/logout') || url.includes('/auth/refresh');

    if (error.response?.status === 401 && !isAuthLifecycleRequest) {
      const config = error.config as RetryableRequestConfig;
      if (!config._retry) {
        config._retry = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          // request interceptor otomatis pakai token baru dari AsyncStorage saat retry ini dikirim ulang.
          return axiosInstance(config);
        }
      }
      await setAuthToken(null);
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);
