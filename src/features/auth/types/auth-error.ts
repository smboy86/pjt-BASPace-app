import type { TAuthErrorCode } from './auth.types';

export class AuthError extends Error {
  readonly code: TAuthErrorCode;

  constructor(code: TAuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
