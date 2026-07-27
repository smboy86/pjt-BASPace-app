import { useMutation } from '@tanstack/react-query';
import { useRemodelRequestStore } from '@/entities/remodel-request';
import { submitRemodelRequest } from '../api';

export const useSubmitRemodelRequest = () => {
  const addRequest = useRemodelRequestStore((state) => state.addRequest);

  return useMutation({
    mutationFn: submitRemodelRequest,
    onSuccess: addRequest,
  });
};
