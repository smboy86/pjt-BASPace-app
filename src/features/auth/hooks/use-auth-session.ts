import { useCallback, useEffect } from 'react';
import { authApi, mapAuthError } from '../api';
import { useAuthStore } from '../store';

let activeConsumers = 0;
let unsubscribeAuth: (() => void) | null = null;
let syncVersion = 0;

const synchronizeSession = async (): Promise<void> => {
  const currentVersion = ++syncVersion;
  const store = useAuthStore.getState();
  store.beginLoading();

  try {
    const result = await authApi.restoreSession();

    if (currentVersion !== syncVersion) {
      return;
    }
    if (result) {
      useAuthStore.getState().setAuthenticated(result.session, result.user);
    } else {
      useAuthStore.getState().setUnauthenticated();
    }
  } catch (error: unknown) {
    if (currentVersion === syncVersion) {
      useAuthStore.getState().setError(mapAuthError(error).message);
    }
  }
};

const startAuthSynchronization = (): void => {
  if (unsubscribeAuth) {
    return;
  }

  void synchronizeSession();
  unsubscribeAuth = authApi.subscribe((event) => {
    if (event === 'SIGNED_OUT') {
      syncVersion += 1;
      useAuthStore.getState().setUnauthenticated();
      return;
    }

    if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      // Supabase advises deferring additional auth calls until its callback
      // finishes to avoid locking the auth client.
      setTimeout(() => {
        void synchronizeSession();
      }, 0);
    }
  });
};

const stopAuthSynchronization = (): void => {
  unsubscribeAuth?.();
  unsubscribeAuth = null;
  syncVersion += 1;
};

export function useAuthSession() {
  const status = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);
  const error = useAuthStore((state) => state.error);

  useEffect(() => {
    activeConsumers += 1;
    startAuthSynchronization();

    return () => {
      activeConsumers -= 1;

      if (activeConsumers === 0) {
        stopAuthSynchronization();
      }
    };
  }, []);

  const retry = useCallback(() => {
    void synchronizeSession();
  }, []);

  return {
    user,
    session,
    error,
    status,
    isLoading: status === 'idle' || status === 'loading',
    isAuthenticated: status === 'authenticated' && user !== null && session !== null,
    retry,
  };
}
