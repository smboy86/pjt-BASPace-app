export type TAuthRole = 'customer' | 'partner_staff' | 'admin';

export type TAuthProfileStatus = 'active' | 'invited' | 'suspended' | 'deleted';

export type TAuthStateStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export type TAuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_verified'
  | 'email_already_registered'
  | 'invalid_email'
  | 'weak_password'
  | 'rate_limited'
  | 'signup_disabled'
  | 'unsupported_role'
  | 'account_inactive'
  | 'profile_unavailable'
  | 'google_existing_email'
  | 'kakao_existing_email'
  | 'oauth_cancelled'
  | 'oauth_failed'
  | 'network_error'
  | 'validation_error'
  | 'unknown';

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IAuthUser {
  id: string;
  email: string;
  name: string | null;
  role: TAuthRole;
  status: TAuthProfileStatus;
  emailVerified: boolean;
}

export interface IAuthSession {
  expiresAt: number | null;
}

export interface ILoginResponse {
  session: IAuthSession;
  user: IAuthUser;
}

export interface IGoogleOAuthRequest {
  redirectTo: string;
}

export interface IGoogleOAuthResponse {
  authorizationUrl: string;
}

export type TSocialAuthProvider = 'google' | 'kakao';

export interface ISignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface ISignupResponse {
  session: null;
  user: IAuthUser;
  verificationRequired: true;
}

export interface IResendVerificationRequest {
  email: string;
}

export interface IAuthState {
  status: TAuthStateStatus;
  session: IAuthSession | null;
  user: IAuthUser | null;
  error: string | null;
}
