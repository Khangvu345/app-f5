import axios from 'axios';

import { env } from '@/config/env';
import { tokenStorage } from '@/services/storage/token-storage';
import { toApiError } from '@/utils/api-error';

let unauthorizedHandler: (() => void) | null = null;

/** Registered once at app start; avoids a circular import with the auth store. */
export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      unauthorizedHandler?.();
    }
    return Promise.reject(toApiError(error));
  },
);
