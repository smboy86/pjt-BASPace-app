import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api';
import { useAuthStore } from '../store';

export function useLogout() {
  return useMutation<void, Error, void>({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      useAuthStore.getState().setUnauthenticated();
    },
  });
}
