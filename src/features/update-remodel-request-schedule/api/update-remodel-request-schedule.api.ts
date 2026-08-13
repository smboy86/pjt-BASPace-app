import { getSupabaseClient } from '@/shared/supabase';
import type { IUpdateRemodelRequestScheduleInput } from '../types';

export const updateRemodelRequestSchedule = async (
  input: IUpdateRemodelRequestScheduleInput,
): Promise<void> => {
  const { error } = await getSupabaseClient().rpc('update_remodel_request_schedule', {
    target_date: input.desiredSchedule,
    target_request_id: input.requestId,
  });

  if (error) throw error;
};
