import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  requestPasswordReset,
  register as registerRequest,
  resetPassword,
  resendVerification,
  verifyEmail,
  type AuthUser
} from '../api/auth';
import { clearAccessToken, clearGuestMode, getAccessToken } from '../api/http';
import { type ProjectRecord } from '../api/projects';
import { AuthMode } from '../lib/editorTypes';
import { validateAuthInput } from '../lib/authValidation';
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
  setAuthEmail: (email: string) => void;
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
  setAuthError, setAuthStatus, setAuthEmail,
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
      clearGuestMode();
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

  const submitAuth = async (): Promise<boolean> => {
    if (authLoading) return false;

    const validationError = validateAuthInput(authMode, authName, authEmail, authPassword);
    if (validationError) {
      setAuthError(validationError);
      setAuthStatus('');
      return false;
    }

    setAuthLoading(true);
    resetAuthMessages();
    try {
      if (authMode === 'register') {
        const response = await registerRequest({ name: authName.trim(), email: authEmail.trim(), password: authPassword });
        setAuthPassword('');
        setAuthName('');
        setAuthStatus(response.message);
        return false;
      }

      const response = await loginRequest({ email: authEmail.trim(), password: authPassword });
      clearGuestMode();
      setAuthUser(response.user);
      setAuthPassword('');
      setAuthStatus('Logged in successfully.');
      await refreshSavedProjects(true);
      return true;
    } catch (error) {
      setAuthError(getErrorMessage(error, authMode === 'register' ? 'Could not register.' : 'Could not log in.'));
      return false;
    } finally {
      setAuthLoading(false);
      setAuthChecking(false);
    }
  };

  const logoutUser = () => {
    logoutRequest();
    clearGuestMode();
    setAuthUser(null);
    setSavedProjects([]);
    setProjectId(null);
    setSavedProjectsError('');
    setProjectStatus('');
    setProjectError('');
    setAuthStatus('Logged out.');
    setAuthPassword('');
  };

  const applyEmailVerificationToken = async (token: string): Promise<boolean> => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      return false;
    }

    setAuthLoading(true);
    resetAuthMessages();
    try {
      const response = await verifyEmail({ token: trimmedToken });
      setAuthEmail(response.email);
      setAuthStatus(response.message);
      return true;
    } catch (error) {
      setAuthError(getErrorMessage(error, 'Could not verify email.'));
      return false;
    } finally {
      setAuthLoading(false);
      setAuthChecking(false);
    }
  };

  const resendEmailVerification = async (): Promise<void> => {
    const email = authEmail.trim();
    if (!email) {
      setAuthError('Enter your email first, then request a new verification email.');
      setAuthStatus('');
      return;
    }

    if (authLoading) {
      return;
    }

    setAuthLoading(true);
    resetAuthMessages();
    try {
      const response = await resendVerification({ email });
      setAuthStatus(response.message);
    } catch (error) {
      setAuthError(getErrorMessage(error, 'Could not resend verification email.'));
    } finally {
      setAuthLoading(false);
      setAuthChecking(false);
    }
  };

  const startPasswordReset = async (): Promise<void> => {
    const email = authEmail.trim();
    if (!email) {
      setAuthError('Enter your email first to receive password reset instructions.');
      setAuthStatus('');
      return;
    }

    if (authLoading) {
      return;
    }

    setAuthLoading(true);
    resetAuthMessages();
    try {
      const response = await requestPasswordReset({ email });
      setAuthStatus(response.message);
    } catch (error) {
      setAuthError(getErrorMessage(error, 'Could not request password reset.'));
    } finally {
      setAuthLoading(false);
      setAuthChecking(false);
    }
  };

  const submitPasswordReset = async (token: string, newPassword: string): Promise<boolean> => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setAuthError('Password reset token is missing.');
      setAuthStatus('');
      return false;
    }

    if (newPassword.length < 8) {
      setAuthError('New password must be at least 8 characters.');
      setAuthStatus('');
      return false;
    }

    if (authLoading) {
      return false;
    }

    setAuthLoading(true);
    resetAuthMessages();
    try {
      const response = await resetPassword({ token: trimmedToken, newPassword });
      setAuthPassword('');
      setAuthStatus(response.message);
      return true;
    } catch (error) {
      setAuthError(getErrorMessage(error, 'Could not reset password.'));
      return false;
    } finally {
      setAuthLoading(false);
      setAuthChecking(false);
    }
  };

  return {
    bootstrapSession,
    submitAuth,
    logoutUser,
    resetAuthMessages,
    applyEmailVerificationToken,
    resendEmailVerification,
    startPasswordReset,
    submitPasswordReset
  };
}
