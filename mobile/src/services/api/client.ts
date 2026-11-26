import axios from 'axios';

import { env } from '@/config/env';
import { tokenStorage } from '@/services/storage/token-storage';
import { toApiError } from '@/utils/api-error';

let unauthorizedHandler: ((token: string) => void) | null = null;
export function setUnauthorizedHandler(handler: ((token: string) => void) | null) {
  unauthorizedHandler = handler;
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  // Authentication failures must never invalidate a previously active session.
  if (!config.url?.startsWith('/auth/')) {
    const token = await tokenStorage.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const header = error.config?.headers?.Authorization;
      if (typeof header === 'string' && header.startsWith('Bearer ')) {
        unauthorizedHandler?.(header.slice(7));
      }
    }
    return Promise.reject(toApiError(error));
  },
);
