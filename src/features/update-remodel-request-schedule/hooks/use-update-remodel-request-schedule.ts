import { useMutation, useQueryClient } from '@tanstack/react-query';
import { remodelRequestQueryKeys } from '@/entities/remodel-request';
import { updateRemodelRequestSchedule } from '../api';

export const useUpdateRemodelRequestSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRemodelRequestSchedule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: remodelRequestQueryKeys.all });
    },
  });
};
