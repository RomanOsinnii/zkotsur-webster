import { AuthMode } from '../../lib/editorTypes';
import { validateAuthInput } from '../../lib/authValidation';
import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ThemeMode } from '../../lib/theme';

type Props = {
  theme: ThemeMode;
  toggleTheme: () => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  resetAuthMessages: () => void;
  authName: string;
  setAuthName: (value: string) => void;
  authEmail: string;
  setAuthEmail: (value: string) => void;
  authPassword: string;
  setAuthPassword: (value: string) => void;
  authLoading: boolean;
  authChecking: boolean;
  authStatus: string;
  authError: string;
  submitAuth: () => Promise<boolean>;
  resendEmailVerification: () => Promise<void>;
  requestPasswordReset: () => Promise<void>;
  passwordResetToken: string | null;
  submitPasswordReset: (newPassword: string) => Promise<boolean>;
  continueAsGuest: () => void;
};

export function AuthPage(props: Props) {
  const {
    theme,
    toggleTheme,
    authMode,
    setAuthMode,
    resetAuthMessages,
    authName,
    setAuthName,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authLoading,
    authChecking,
    authStatus,
    authError,
    submitAuth,
    resendEmailVerification,
    requestPasswordReset,
    passwordResetToken,
    submitPasswordReset,
    continueAsGuest
  } = props;

  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');

  const validationError = validateAuthInput(authMode, authName, authEmail, authPassword);
  const hasAuthInput = authEmail.trim().length > 0 || authPassword.length > 0 || (authMode === 'register' && authName.trim().length > 0);
  const submitDisabled = authLoading || authChecking || Boolean(validationError);
  const resetValidationError = resetPasswordValue.length > 0 && resetPasswordValue.length < 8
    ? 'New password must be at least 8 characters.'
    : resetPasswordConfirm.length > 0 && resetPasswordValue !== resetPasswordConfirm
      ? 'Password confirmation does not match.'
      : '';

  const canSubmitPasswordReset = Boolean(passwordResetToken)
    && resetPasswordValue.length >= 8
    && resetPasswordConfirm === resetPasswordValue
    && !authLoading
    && !authChecking;

  return (
    <main className="auth-page" aria-label="Authentication page">
      <section className="auth-card">
        <header className="auth-head">
          <div className="theme-toggle-row">
            <button
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="theme-toggle"
              onClick={toggleTheme}
              type="button"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
          </div>
          <p className="eyebrow">Webster</p>
          <h1>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p>
            {authMode === 'login'
              ? 'Log in to manage templates, save projects, and export from backend.'
              : 'Register to save projects in PostgreSQL and manage team-ready templates.'}
          </p>
        </header>

        <div className="segmented-control auth-mode-switch" role="tablist" aria-label="Authentication mode">
          <button
            className={authMode === 'login' ? 'active' : ''}
            onClick={() => {
              setAuthMode('login');
              resetAuthMessages();
            }}
            type="button"
          >
            Login
          </button>
          <button
            className={authMode === 'register' ? 'active' : ''}
            onClick={() => {
              setAuthMode('register');
              resetAuthMessages();
            }}
            type="button"
          >
            Register
          </button>
        </div>

        {authMode === 'register' ? (
          <label className="field compact-field auth-field">
            <span>Name</span>
            <input
              autoComplete="name"
              onChange={(event) => setAuthName(event.target.value)}
              placeholder="Your name"
              type="text"
              value={authName}
            />
          </label>
        ) : null}

        <label className="field compact-field auth-field">
          <span>Email</span>
          <input
            autoComplete="email"
            onChange={(event) => setAuthEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={authEmail}
          />
        </label>

        <label className="field compact-field auth-field">
          <span>Password</span>
          <input
            autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            onChange={(event) => setAuthPassword(event.target.value)}
            placeholder="At least 8 characters"
            type="password"
            value={authPassword}
          />
        </label>

        <button className="wide-action auth-submit" disabled={submitDisabled} onClick={() => void submitAuth()} type="button">
          {authChecking ? 'Checking session...' : authLoading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create account'}
        </button>

        {authMode === 'login' ? (
          <button
            className="wide-action muted-action"
            disabled={authLoading || authChecking}
            onClick={() => void resendEmailVerification()}
            type="button"
          >
            {authLoading ? 'Please wait...' : 'Resend verification email'}
          </button>
        ) : null}

        {authMode === 'login' ? (
          <button
            className="wide-action muted-action"
            disabled={authLoading || authChecking}
            onClick={() => void requestPasswordReset()}
            type="button"
          >
            {authLoading ? 'Please wait...' : 'Forgot password'}
          </button>
        ) : null}

        {passwordResetToken ? (
          <section className="auth-reset-box" aria-label="Reset password">
            <p className="auth-reset-title">Set a new password</p>
            <label className="field compact-field auth-field">
              <span>New password</span>
              <input
                autoComplete="new-password"
                onChange={(event) => setResetPasswordValue(event.target.value)}
                placeholder="At least 8 characters"
                type="password"
                value={resetPasswordValue}
              />
            </label>
            <label className="field compact-field auth-field">
              <span>Confirm new password</span>
              <input
                autoComplete="new-password"
                onChange={(event) => setResetPasswordConfirm(event.target.value)}
                placeholder="Repeat new password"
                type="password"
                value={resetPasswordConfirm}
              />
            </label>
            <button
              className="wide-action"
              disabled={!canSubmitPasswordReset || Boolean(resetValidationError)}
              onClick={() => {
                void submitPasswordReset(resetPasswordValue).then((ok) => {
                  if (ok) {
                    setResetPasswordValue('');
                    setResetPasswordConfirm('');
                  }
                });
              }}
              type="button"
            >
              {authLoading ? 'Please wait...' : 'Update password'}
            </button>
            {resetValidationError ? <p className="auth-validation-hint">{resetValidationError}</p> : null}
          </section>
        ) : null}

        {hasAuthInput && validationError ? <p className="auth-validation-hint">{validationError}</p> : null}

        <button className="wide-action muted-action" disabled={authLoading || authChecking} onClick={continueAsGuest} type="button">
          Continue as guest
        </button>

        {authStatus ? <p className="project-feedback success">{authStatus}</p> : null}
        {authError ? <p className="project-feedback error">{authError}</p> : null}
      </section>
    </main>
  );
}
