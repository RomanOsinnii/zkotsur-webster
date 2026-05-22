import { compare, hash } from 'bcryptjs';

const passwordSaltRounds = 10;

export function hashPassword(password: string): Promise<string> {
  return hash(password, passwordSaltRounds);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}
