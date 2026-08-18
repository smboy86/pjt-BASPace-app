import { getSupabaseClient } from '@/shared/supabase';
import type { IConstructionTypeCostSetting, IUpdateDemolitionCostInput } from '../types';

export const fetchDemolitionCostSetting = async (): Promise<IConstructionTypeCostSetting> => {
  const { data, error } = await getSupabaseClient()
    .from('construction_type_cost_settings')
    .select('code, amount_manwon, updated_by, updated_at')
    .eq('code', 'DEMOLITION')
    .single();

  if (error) throw error;

  return {
    amountManwon: data.amount_manwon,
    code: 'DEMOLITION',
    updatedAt: data.updated_at,
    updatedBy: data.updated_by ?? undefined,
  };
};

export const updateDemolitionCostSetting = async ({
  amountManwon,
}: IUpdateDemolitionCostInput): Promise<void> => {
  const { error } = await getSupabaseClient().rpc('update_demolition_cost_setting', {
    target_amount_manwon: amountManwon,
  });

  if (error) throw error;
};
