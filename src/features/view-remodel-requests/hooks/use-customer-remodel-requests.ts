import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { remodelRequestQueryKeys, useRemodelRequestStore } from '@/entities/remodel-request';
import { fetchCustomerRemodelRequests } from '../api';

export const useCustomerRemodelRequests = (customerId: string) => {
  const hydrateRequests = useRemodelRequestStore((state) => state.hydrateRequests);
  const query = useQuery({
    queryKey: remodelRequestQueryKeys.customer(customerId),
    queryFn: () => fetchCustomerRemodelRequests(customerId),
    enabled: Boolean(customerId),
  });

  useEffect(() => {
    if (query.data) {
      hydrateRequests(query.data);
    }
  }, [hydrateRequests, query.data]);

  return query;
};
