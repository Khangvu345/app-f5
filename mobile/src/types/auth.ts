import type { LocalProfile } from './local-storage';

export interface User {
  id: string;
  email: string | null;
  displayName: string;
  planType: 'FREE' | 'PREMIUM';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  displayName: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface StoredSession {
  accessToken: string;
  expiresAt: number;
  user: User;
  pendingLink: boolean;
  pendingSource: LocalProfile | null;
}
