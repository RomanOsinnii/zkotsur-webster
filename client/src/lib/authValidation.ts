import { AuthMode } from './editorTypes';

export function validateAuthInput(mode: AuthMode, name: string, email: string, password: string): string {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim();

  if (mode === 'register' && normalizedName.length < 2) {
    return 'Name must be at least 2 characters.';
  }

  if (!normalizedEmail) {
    return 'Email is required.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalizedEmail)) {
    return 'Enter a valid email address.';
  }

  if (!password) {
    return 'Password is required.';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  return '';
}
