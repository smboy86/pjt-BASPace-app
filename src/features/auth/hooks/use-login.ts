import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api';
import { useAuthStore } from '../store';
import type { ILoginRequest, ILoginResponse } from '../types';

export function useLogin() {
  return useMutation<ILoginResponse, Error, ILoginRequest>({
    mutationFn: (data: ILoginRequest) => authApi.login(data),
    onSuccess: ({ session, user }) => {
      useAuthStore.getState().setAuthenticated(session, user);
    },
  });
}
