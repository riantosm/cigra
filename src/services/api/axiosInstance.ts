import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import axios from 'axios';

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
    if (error.response?.status === 401) {
      await setAuthToken(null);
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);
