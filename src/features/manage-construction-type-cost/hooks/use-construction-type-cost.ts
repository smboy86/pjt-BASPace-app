import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDemolitionCostSetting, updateDemolitionCostSetting } from '../api';

export const CONSTRUCTION_TYPE_COST_QUERY_KEY = ['admin', 'construction-type-cost'] as const;

export const useDemolitionCostSetting = () =>
  useQuery({
    queryKey: CONSTRUCTION_TYPE_COST_QUERY_KEY,
    queryFn: fetchDemolitionCostSetting,
  });

export const useUpdateDemolitionCostSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDemolitionCostSetting,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CONSTRUCTION_TYPE_COST_QUERY_KEY });
    },
  });
};
