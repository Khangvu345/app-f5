// NOTE: these shapes are a proposal. Align them with the backend contract in Phase 2.
export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  fullName: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
