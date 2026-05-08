import { buildApiPath, clearAccessToken, requestJson, setAccessToken } from './http';

const authBasePath = buildApiPath('/api/auth');

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export async function register(payload: RegisterPayload) {
  const response = await requestJson<AuthResponse>(`${authBasePath}/register`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  setAccessToken(response.accessToken);
  return response;
}

export async function login(payload: LoginPayload) {
  const response = await requestJson<AuthResponse>(`${authBasePath}/login`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  setAccessToken(response.accessToken);
  return response;
}

export function getCurrentUser() {
  return requestJson<AuthUser>(`${authBasePath}/me`, undefined, { auth: true });
}

export function logout() {
  clearAccessToken();
}
