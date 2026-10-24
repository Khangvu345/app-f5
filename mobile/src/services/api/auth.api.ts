import type { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types/auth';

import { apiClient } from './client';

// Endpoint paths are a proposal; keep them in sync with the backend controllers.
export const authApi = {
  login: async (payload: LoginPayload) =>
    (await apiClient.post<AuthResponse>('/auth/login', payload)).data,

  register: async (payload: RegisterPayload) =>
    (await apiClient.post<AuthResponse>('/auth/register', payload)).data,

  me: async () => (await apiClient.get<User>('/users/me')).data,
};
