import { useMutation, useQueryClient } from '@tanstack/react-query';
import { remodelRequestQueryKeys } from '@/entities/remodel-request';
import { adjustRemodelRequestQuote, confirmAdjustedRemodelRequestQuote } from '../api';

export const useAdjustRemodelRequestQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adjustRemodelRequestQuote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: remodelRequestQueryKeys.all });
    },
  });
};

export const useConfirmAdjustedRemodelRequestQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmAdjustedRemodelRequestQuote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: remodelRequestQueryKeys.all });
    },
  });
};
