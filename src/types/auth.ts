import type { Organization } from "./organization";

export interface User {
  avatar?: string;
  created_at: string;
  email: string;
  first_name?: string;
  id: string;
  last_name?: string;
  organization?: Organization;
  organization_id?: string;
  role?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  first_name?: string;
  last_name?: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

/** A whitelabel callback exchange returns a bearer token instead of a cookie. */
export interface TokenAuthResponse extends AuthResponse {
  expires_at: string;
  token: string;
}

export interface RegisterResponse {
  user: User;
}

export interface UpdateUserRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  organization_id?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ServerResponse<T = unknown> {
  code?: string;
  data?: T;
  error?: string;
  message?: string;
}
