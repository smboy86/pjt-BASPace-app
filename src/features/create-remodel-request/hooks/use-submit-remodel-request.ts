import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  remodelRequestQueryKeys,
  type IRemodelRequest,
  useRemodelRequestStore,
} from '@/entities/remodel-request';
import { submitRemodelRequest } from '../api';

export const useSubmitRemodelRequest = () => {
  const queryClient = useQueryClient();
  const addRequest = useRemodelRequestStore((state) => state.addRequest);

  return useMutation({
    mutationFn: submitRemodelRequest,
    onSuccess: (request, input) => {
      const queryKey = remodelRequestQueryKeys.customer(input.customerId);
      addRequest(request);
      queryClient.setQueryData<IRemodelRequest[]>(queryKey, (current = []) => [
        request,
        ...current.filter((item) => item.id !== request.id),
      ]);
      void queryClient.invalidateQueries({
        queryKey,
      });
    },
  });
};
