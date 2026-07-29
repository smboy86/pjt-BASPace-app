import { ERemodelRequestStatus } from '@/entities/remodel-request';
import { getSupabaseClient } from '@/shared/supabase';

export const completeRemodelRequest = async (requestId: string): Promise<ERemodelRequestStatus> => {
  const { data, error } = await getSupabaseClient().rpc('complete_remodel_request', {
    target_request_id: requestId,
  });

  if (error) throw error;
  if (data !== ERemodelRequestStatus.CLOSED) {
    throw new Error('Unexpected remodel request completion status.');
  }

  return ERemodelRequestStatus.CLOSED;
};
