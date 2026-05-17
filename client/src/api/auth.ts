import { buildApiPath, clearAccessToken, requestJson, setAccessToken } from './http';

const authBasePath = buildApiPath('/api/auth');

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type RegisterResponse = {
  requiresEmailVerification: boolean;
  message: string;
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

export type UpdateMePayload = {
  name?: string;
  avatarUrl?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type VerifyEmailPayload = {
  token: string;
};

export type VerifyEmailResponse = {
  ok: boolean;
  email: string;
  message: string;
};

export type ResendVerificationPayload = {
  email: string;
};

export type ResendVerificationResponse = {
  ok: boolean;
  message: string;
};

export type RequestPasswordResetPayload = {
  email: string;
};

export type RequestPasswordResetResponse = {
  ok: boolean;
  message: string;
};

export type ResetPasswordPayload = {
  token: string;
  newPassword: string;
};

export type ResetPasswordResponse = {
  ok: boolean;
  message: string;
};

export async function register(payload: RegisterPayload) {
  return requestJson<RegisterResponse>(`${authBasePath}/register`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
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

export function updateCurrentUser(payload: UpdateMePayload) {
  return requestJson<AuthUser>(`${authBasePath}/me`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  }, { auth: true });
}

export function changeCurrentUserPassword(payload: ChangePasswordPayload) {
  return requestJson<{ ok: boolean }>(`${authBasePath}/me/password`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  }, { auth: true });
}

export function verifyEmail(payload: VerifyEmailPayload) {
  return requestJson<VerifyEmailResponse>(`${authBasePath}/verify-email`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function resendVerification(payload: ResendVerificationPayload) {
  return requestJson<ResendVerificationResponse>(`${authBasePath}/resend-verification`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function requestPasswordReset(payload: RequestPasswordResetPayload) {
  return requestJson<RequestPasswordResetResponse>(`${authBasePath}/forgot-password`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function resetPassword(payload: ResetPasswordPayload) {
  return requestJson<ResetPasswordResponse>(`${authBasePath}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function logout() {
  clearAccessToken();
}
