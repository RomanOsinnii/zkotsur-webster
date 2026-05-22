export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'webster-theme';

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function getStoredThemePreference(): ThemeMode | null {
  try {
    const value = globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? null;
    return isThemeMode(value) ? value : null;
  } catch {
    return null;
  }
}

export function getSystemThemePreference(): ThemeMode {
  try {
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function getInitialThemePreference(): ThemeMode {
  return getStoredThemePreference() ?? getSystemThemePreference();
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.body.dataset.theme = theme;
}

export function persistThemePreference(theme: ThemeMode): void {
  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors.
  }
}

export function clearStoredThemePreference(): void {
  try {
    globalThis.localStorage?.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}
