import { create } from 'zustand';
import type { IAuthSession, IAuthState, IAuthUser } from '../types';

interface IAuthStore extends IAuthState {
  beginLoading: () => void;
  setAuthenticated: (session: IAuthSession, user: IAuthUser) => void;
  setUnauthenticated: () => void;
  setError: (message: string) => void;
}

const INITIAL_STATE: IAuthState = {
  status: 'idle',
  session: null,
  user: null,
  error: null,
};

export const useAuthStore = create<IAuthStore>((set) => ({
  ...INITIAL_STATE,
  beginLoading: () => set({ status: 'loading', error: null }),
  setAuthenticated: (session, user) =>
    set({
      status: 'authenticated',
      session,
      user,
      error: null,
    }),
  setUnauthenticated: () =>
    set({
      status: 'unauthenticated',
      session: null,
      user: null,
      error: null,
    }),
  setError: (message) =>
    set({
      status: 'error',
      session: null,
      user: null,
      error: message,
    }),
}));
