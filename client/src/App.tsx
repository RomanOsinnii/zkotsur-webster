import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { getAccessToken, isGuestModeEnabled } from './api/http';
import { EditorApp } from './components/EditorApp';
import {
  ThemeMode,
  applyTheme,
  clearStoredThemePreference,
  getInitialThemePreference,
  getStoredThemePreference,
  persistThemePreference
} from './lib/theme';

function canAccessProtectedRoute() {
  return Boolean(getAccessToken() || isGuestModeEnabled());
}

function RootRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const hasAuthQuery =
    params.has('verifyEmailToken')
    || params.has('resetPasswordToken')
    || params.has('returnTo');

  if (hasAuthQuery) {
    return <Navigate replace to={`/login${location.search}`} />;
  }

  return <Navigate replace to={canAccessProtectedRoute() ? '/editor' : '/login'} />;
}

function AppRoutes({ theme, toggleTheme }: { theme: ThemeMode; toggleTheme: () => void }) {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<EditorApp theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/editor" element={<ProtectedRouteWithTheme theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/editor/:projectId" element={<ProtectedRouteWithTheme theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/shared/:shareSlug" element={<EditorApp theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/projects" element={<ProtectedRouteWithTheme theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/templates" element={<ProtectedRouteWithTheme theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/profile" element={<ProtectedRouteWithTheme theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

function ProtectedRouteWithTheme({ theme, toggleTheme }: { theme: ThemeMode; toggleTheme: () => void }) {
  const location = useLocation();

  if (canAccessProtectedRoute()) {
    return <EditorApp theme={theme} toggleTheme={toggleTheme} />;
  }

  return <Navigate replace to={`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`} />;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialThemePreference());
  const [themeSource, setThemeSource] = useState<'system' | 'user'>(() => getStoredThemePreference() ? 'user' : 'system');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (themeSource === 'user') {
      persistThemePreference(theme);
      return;
    }

    clearStoredThemePreference();
  }, [theme, themeSource]);

  useEffect(() => {
    if (themeSource !== 'system' || typeof globalThis.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? 'dark' : 'light');
    };

    setTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener?.('change', handleChange);

    return () => {
      mediaQuery.removeEventListener?.('change', handleChange);
    };
  }, [themeSource]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
    setThemeSource('user');
  };

  return (
    <BrowserRouter>
      <AppRoutes theme={theme} toggleTheme={toggleTheme} />
    </BrowserRouter>
  );
}
