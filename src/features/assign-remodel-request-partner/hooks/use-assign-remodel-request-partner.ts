import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { remodelRequestQueryKeys } from '@/entities/remodel-request';
import { assignRemodelRequestPartner, fetchAssignablePartners } from '../api';

const ASSIGNABLE_PARTNERS_QUERY_KEY = ['admin', 'assignable-partners'] as const;

export const useAssignablePartners = (enabled: boolean) =>
  useQuery({
    queryKey: ASSIGNABLE_PARTNERS_QUERY_KEY,
    queryFn: fetchAssignablePartners,
    enabled,
    refetchOnMount: 'always',
  });

export const useAssignRemodelRequestPartner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignRemodelRequestPartner,
    onSuccess: (_assignmentId, input) => {
      void queryClient.invalidateQueries({ queryKey: remodelRequestQueryKeys.admin });
      void queryClient.invalidateQueries({
        queryKey: remodelRequestQueryKeys.detail(input.requestId),
      });
    },
  });
};
