import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPartner,
  createPartnerDocumentSignedUrl,
  fetchCurrentPartnerWorkspace,
  fetchPartner,
  fetchPartners,
} from '../api';

const PARTNERS_QUERY_KEY = ['admin', 'partners'] as const;
const PARTNER_WORKSPACE_QUERY_KEY = ['partner', 'workspace'] as const;

export const usePartners = () =>
  useQuery({
    queryKey: PARTNERS_QUERY_KEY,
    queryFn: fetchPartners,
  });

export const usePartner = (partnerId: string) =>
  useQuery({
    queryKey: [...PARTNERS_QUERY_KEY, partnerId],
    queryFn: () => fetchPartner(partnerId),
    enabled: Boolean(partnerId),
  });

export const useCreatePartner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    gcTime: 0,
    mutationFn: createPartner,
    onSuccess: async (partner) => {
      queryClient.setQueryData([...PARTNERS_QUERY_KEY, partner.id], partner);
      await queryClient.invalidateQueries({ queryKey: PARTNERS_QUERY_KEY });
    },
  });
};

export const usePartnerDocumentUrl = (imagePath: string | null) =>
  useQuery({
    queryKey: [...PARTNERS_QUERY_KEY, 'document', imagePath],
    queryFn: () => createPartnerDocumentSignedUrl(imagePath ?? ''),
    enabled: Boolean(imagePath),
    staleTime: 1000 * 60 * 8,
  });

export const useCurrentPartnerWorkspace = () =>
  useQuery({
    queryKey: PARTNER_WORKSPACE_QUERY_KEY,
    queryFn: fetchCurrentPartnerWorkspace,
  });
