const rawApiUrl = import.meta.env.VITE_API_URL?.trim() ?? '';
const apiBaseUrl = rawApiUrl.replace(/\/$/, '');
const accessTokenStorageKey = 'webster-access-token';
const guestModeStorageKey = 'webster-guest-mode';
const guestIdStorageKey = 'webster-guest-id';

export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function buildApiPath(path: string) {
  return `${apiBaseUrl}${path}`;
}

export function getAccessToken() {
  const storage = globalThis.localStorage;
  if (!storage || typeof storage.getItem !== 'function') {
    return '';
  }
  return storage.getItem(accessTokenStorageKey) ?? '';
}

export function setAccessToken(token: string) {
  const storage = globalThis.localStorage;
  if (!storage || typeof storage.setItem !== 'function') {
    return;
  }
  storage.setItem(accessTokenStorageKey, token);
}

export function clearAccessToken() {
  const storage = globalThis.localStorage;
  if (!storage || typeof storage.removeItem !== 'function') {
    return;
  }
  storage.removeItem(accessTokenStorageKey);
}

export function getOrCreateGuestId() {
  const storage = globalThis.localStorage;
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    return `guest-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }
  const existing = storage.getItem(guestIdStorageKey)?.trim();
  if (existing) return existing;
  const guestId = `guest-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  storage.setItem(guestIdStorageKey, guestId);
  return guestId;
}

export function clearGuestId() {
  const storage = globalThis.localStorage;
  if (!storage || typeof storage.removeItem !== 'function') {
    return;
  }
  storage.removeItem(guestIdStorageKey);
}

export function isGuestModeEnabled() {
  const storage = globalThis.sessionStorage;
  if (!storage || typeof storage.getItem !== 'function') {
    return false;
  }
  return storage.getItem(guestModeStorageKey) === 'true';
}

export function enableGuestMode() {
  const storage = globalThis.sessionStorage;
  if (!storage || typeof storage.setItem !== 'function') {
    return;
  }
  storage.setItem(guestModeStorageKey, 'true');
}

export function clearGuestMode() {
  const storage = globalThis.sessionStorage;
  if (!storage || typeof storage.removeItem !== 'function') {
    return;
  }
  storage.removeItem(guestModeStorageKey);
}

export async function requestJson<T>(input: string, init?: RequestInit, options?: { auth?: boolean }): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const isFormDataBody = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  if (!headers.has('Content-Type') && init?.body && !isFormDataBody) {
    headers.set('Content-Type', 'application/json');
  }

  if (options?.auth) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      headers.set('X-Guest-Id', getOrCreateGuestId());
    }
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new HttpError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function parseErrorMessage(response: Response) {
  try {
    const payload = await response.json() as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Fall back to HTTP status text.
  }

  return response.statusText || 'Request failed';
}

export function getHttpErrorStatus(error: unknown): number | null {
  return error instanceof HttpError ? error.status : null;
}
