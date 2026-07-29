import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ERemodelRequestStatus,
  remodelRequestQueryKeys,
  type IRemodelRequest,
} from '@/entities/remodel-request';
import { completeRemodelRequest } from '../api';

interface IRequestDetailCache {
  request: IRemodelRequest;
}

interface IRequestListCacheItem {
  id: string;
  status: ERemodelRequestStatus;
}

const applyCompletedStatusToDetail = (
  current: IRequestDetailCache | undefined,
): IRequestDetailCache | undefined =>
  current
    ? {
        ...current,
        request: {
          ...current.request,
          status: ERemodelRequestStatus.CLOSED,
        },
      }
    : current;

const applyCompletedStatusToList = (
  current: IRequestListCacheItem[] | undefined,
  requestId: string,
): IRequestListCacheItem[] | undefined =>
  current?.map((request) =>
    request.id === requestId ? { ...request, status: ERemodelRequestStatus.CLOSED } : request,
  );

export const useCompleteRemodelRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeRemodelRequest,
    onSuccess: (_status, requestId) => {
      queryClient.setQueryData<IRequestDetailCache>(
        remodelRequestQueryKeys.detail(requestId),
        applyCompletedStatusToDetail,
      );
      queryClient.setQueryData<IRequestDetailCache>(
        remodelRequestQueryKeys.partnerDetail(requestId),
        applyCompletedStatusToDetail,
      );
      queryClient.setQueryData<IRequestListCacheItem[]>(remodelRequestQueryKeys.admin, (current) =>
        applyCompletedStatusToList(current, requestId),
      );
      queryClient.setQueryData<IRequestListCacheItem[]>(
        remodelRequestQueryKeys.partner,
        (current) => applyCompletedStatusToList(current, requestId),
      );

      void queryClient.invalidateQueries({ queryKey: remodelRequestQueryKeys.all });
    },
  });
};
