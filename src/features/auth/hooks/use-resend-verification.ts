import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api';
import type { IResendVerificationRequest } from '../types';

export function useResendVerification() {
  return useMutation<void, Error, IResendVerificationRequest>({
    mutationFn: (data) => authApi.resendVerification(data),
  });
}
