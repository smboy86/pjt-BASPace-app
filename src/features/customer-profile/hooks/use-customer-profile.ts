import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCustomerProfile, updateCustomerProfile } from '../api';
import type { IUpdateCustomerProfileInput } from '../types';

const customerProfileQueryKey = (customerId: string) =>
  ['customer', 'profile', customerId] as const;

export const useCustomerProfile = (customerId: string) =>
  useQuery({
    queryKey: customerProfileQueryKey(customerId),
    queryFn: () => fetchCustomerProfile(customerId),
    enabled: Boolean(customerId),
  });

export const useUpdateCustomerProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: IUpdateCustomerProfileInput) => updateCustomerProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(customerProfileQueryKey(profile.id), profile);
    },
  });
};
