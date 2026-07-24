export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IAuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface IAuthSession {
  expiresAt: number | null;
}

export interface ILoginResponse {
  session: IAuthSession;
  user: IAuthUser;
}

export interface ISignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface ISignupResponse {
  session: IAuthSession | null;
  user: IAuthUser;
}
