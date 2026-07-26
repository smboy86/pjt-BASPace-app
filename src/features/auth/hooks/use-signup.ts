import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api';
import { useAuthStore } from '../store';
import type { ISignupRequest, ISignupResponse } from '../types';

export function useSignup() {
  return useMutation<ISignupResponse, Error, ISignupRequest>({
    mutationFn: (data: ISignupRequest) => authApi.signup(data),
    onSuccess: () => {
      useAuthStore.getState().setUnauthenticated();
    },
  });
}
