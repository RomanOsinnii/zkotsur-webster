import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest, type AuthUser } from '../api/auth';
import { clearAccessToken, getAccessToken } from '../api/http';
import { type ProjectRecord } from '../api/projects';
import { AuthMode } from '../lib/editorTypes';
import { getErrorMessage } from '../lib/editorHelpers';

interface Params {
  authMode: AuthMode;
  authName: string;
  authEmail: string;
  authPassword: string;
  authLoading: boolean;
  setAuthUser: (user: AuthUser | null) => void;
  setAuthName: (name: string) => void;
  setAuthPassword: (password: string) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthChecking: (checking: boolean) => void;
  setAuthError: (error: string) => void;
  setAuthStatus: (status: string) => void;
  setSavedProjects: (projects: ProjectRecord[]) => void;
  setProjectId: (id: string | null) => void;
  setSavedProjectsError: (error: string) => void;
  setProjectStatus: (status: string) => void;
  setProjectError: (error: string) => void;
  refreshSavedProjects: (silentIfLoggedOut?: boolean) => Promise<void>;
}

export function useAuth({
  authMode, authName, authEmail, authPassword, authLoading,
  setAuthUser, setAuthName, setAuthPassword, setAuthLoading, setAuthChecking,
  setAuthError, setAuthStatus,
  setSavedProjects, setProjectId, setSavedProjectsError, setProjectStatus, setProjectError,
  refreshSavedProjects
}: Params) {
  const resetAuthMessages = () => {
    setAuthError('');
    setAuthStatus('');
  };

  const bootstrapSession = async () => {
    if (!getAccessToken()) {
      setAuthChecking(false);
      setSavedProjects([]);
      return;
    }
    setAuthChecking(true);
    try {
      const user = await getCurrentUser();
      setAuthUser(user);
      await refreshSavedProjects(true);
    } catch (error) {
      clearAccessToken();
      setAuthUser(null);
      setSavedProjects([]);
      setAuthError(getErrorMessage(error, 'Could not restore your session. Please log in again.'));
    } finally {
      setAuthChecking(false);
    }
  };

  const submitAuth = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    resetAuthMessages();
    try {
      const response = authMode === 'register'
        ? await registerRequest({ name: authName.trim(), email: authEmail.trim(), password: authPassword })
        : await loginRequest({ email: authEmail.trim(), password: authPassword });
      setAuthUser(response.user);
      setAuthPassword('');
      if (authMode === 'register') setAuthName('');
      setAuthStatus(authMode === 'register' ? 'Account created. You are now logged in.' : 'Logged in successfully.');
      await refreshSavedProjects(true);
    } catch (error) {
      setAuthError(getErrorMessage(error, authMode === 'register' ? 'Could not register.' : 'Could not log in.'));
    } finally {
      setAuthLoading(false);
      setAuthChecking(false);
    }
  };

  const logoutUser = () => {
    logoutRequest();
    setAuthUser(null);
    setSavedProjects([]);
    setProjectId(null);
    setSavedProjectsError('');
    setProjectStatus('');
    setProjectError('');
    setAuthStatus('Logged out.');
    setAuthPassword('');
  };

  return { bootstrapSession, submitAuth, logoutUser, resetAuthMessages };
}
