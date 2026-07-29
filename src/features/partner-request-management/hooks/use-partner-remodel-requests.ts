import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { remodelRequestQueryKeys } from '@/entities/remodel-request';
import {
  fetchPartnerRemodelRequestDetail,
  fetchPartnerRemodelRequests,
  respondToPartnerRequest,
} from '../api';

export const usePartnerRemodelRequests = () =>
  useQuery({
    queryKey: remodelRequestQueryKeys.partner,
    queryFn: fetchPartnerRemodelRequests,
  });

export const usePartnerRemodelRequestDetail = (requestId: string) =>
  useQuery({
    queryKey: remodelRequestQueryKeys.partnerDetail(requestId),
    queryFn: () => fetchPartnerRemodelRequestDetail(requestId),
    enabled: Boolean(requestId),
  });

export const useRespondToPartnerRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: respondToPartnerRequest,
    onSuccess: async (_assignmentStatus, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: remodelRequestQueryKeys.partner }),
        queryClient.invalidateQueries({
          queryKey: remodelRequestQueryKeys.partnerDetail(input.requestId),
        }),
        queryClient.invalidateQueries({
          queryKey: remodelRequestQueryKeys.detail(input.requestId),
        }),
        queryClient.invalidateQueries({ queryKey: remodelRequestQueryKeys.admin }),
      ]);
    },
  });
};
