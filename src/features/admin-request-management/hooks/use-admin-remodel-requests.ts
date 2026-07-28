import { useQuery } from '@tanstack/react-query';
import { fetchAdminRemodelRequests } from '../api';

const ADMIN_REMODEL_REQUESTS_QUERY_KEY = ['admin', 'remodel-requests'] as const;

export const useAdminRemodelRequests = () =>
  useQuery({
    queryKey: ADMIN_REMODEL_REQUESTS_QUERY_KEY,
    queryFn: fetchAdminRemodelRequests,
  });
