import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchRequestConsultationMessages,
  postRequestConsultationMessage,
} from '../api';

const REQUEST_CONSULTATION_QUERY_KEY = ['request-consultation-messages'] as const;

export const requestConsultationQueryKeys = {
  all: REQUEST_CONSULTATION_QUERY_KEY,
  request: (requestId: string) => [...REQUEST_CONSULTATION_QUERY_KEY, requestId] as const,
};

export const useRequestConsultationMessages = (requestId: string) =>
  useQuery({
    queryKey: requestConsultationQueryKeys.request(requestId),
    queryFn: () => fetchRequestConsultationMessages(requestId),
    enabled: Boolean(requestId),
    refetchOnMount: 'always',
  });

export const usePostRequestConsultationMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postRequestConsultationMessage,
    onSuccess: async (_message, input) => {
      await queryClient.invalidateQueries({
        queryKey: requestConsultationQueryKeys.request(input.requestId),
      });
    },
  });
};
