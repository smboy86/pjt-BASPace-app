import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { remodelRequestQueryKeys } from '@/entities/remodel-request';
import {
  fetchPartnerRemodelRequestDetail,
  fetchPartnerRemodelRequests,
  respondToPartnerRequest,
} from '../api';
import {
  applyPartnerResponseToDetailCache,
  applyPartnerResponseToListCache,
} from '../model';
import type {
  IPartnerRemodelRequestDetail,
  IPartnerRemodelRequestListItem,
} from '../types';

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
    onSuccess: (assignmentStatus, input) => {
      queryClient.setQueryData<IPartnerRemodelRequestListItem[]>(
        remodelRequestQueryKeys.partner,
        (current) =>
          applyPartnerResponseToListCache(current, input.requestId, assignmentStatus),
      );
      queryClient.setQueryData<IPartnerRemodelRequestDetail>(
        remodelRequestQueryKeys.partnerDetail(input.requestId),
        (current) => applyPartnerResponseToDetailCache(current, assignmentStatus),
      );

      void queryClient.invalidateQueries({ queryKey: remodelRequestQueryKeys.all });
    },
  });
};
