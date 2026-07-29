import { useQuery } from '@tanstack/react-query';
import { remodelRequestQueryKeys } from '@/entities/remodel-request';
import { fetchAdminRemodelRequests } from '../api';

export const useAdminRemodelRequests = () =>
  useQuery({
    queryKey: remodelRequestQueryKeys.admin,
    queryFn: fetchAdminRemodelRequests,
  });
