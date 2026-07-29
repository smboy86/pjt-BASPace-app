import { useQuery } from '@tanstack/react-query';
import { remodelRequestQueryKeys } from '@/entities/remodel-request';
import { fetchRemodelRequestDetail } from '../api';

export const useRemodelRequestDetail = (requestId: string) =>
  useQuery({
    queryKey: remodelRequestQueryKeys.detail(requestId),
    queryFn: () => fetchRemodelRequestDetail(requestId),
    enabled: Boolean(requestId),
    refetchOnMount: 'always',
  });
