import {
  mapRemodelRequest,
  mapRemodelRequestScheduleChange,
  mapSelectionSnapshot,
  type ISelectionSnapshot,
} from '@/entities/remodel-request';
import { getSupabaseClient } from '@/shared/supabase';
import type { IRemodelRequestDetail } from '../types';

export const fetchRemodelRequestDetail = async (
  requestId: string,
): Promise<IRemodelRequestDetail> => {
  const supabase = getSupabaseClient();
  const { data: requestRow, error: requestError } = await supabase
    .from('remodel_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (requestError) throw requestError;

  const [selectionsResult, customerResult, scheduleChangesResult] = await Promise.all([
    supabase
      .from('selection_snapshots')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
    supabase.from('profiles').select('display_name').eq('id', requestRow.customer_id).single(),
    supabase
      .from('remodel_request_schedule_changes')
      .select('*')
      .eq('request_id', requestId)
      .order('changed_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1),
  ]);

  if (selectionsResult.error) throw selectionsResult.error;
  if (customerResult.error) throw customerResult.error;
  if (scheduleChangesResult.error) throw scheduleChangesResult.error;

  const selections: ISelectionSnapshot[] = selectionsResult.data.map(mapSelectionSnapshot);

  return {
    request: mapRemodelRequest(
      requestRow,
      selections,
      scheduleChangesResult.data[0]
        ? mapRemodelRequestScheduleChange(scheduleChangesResult.data[0])
        : undefined,
    ),
    customerName: customerResult.data.display_name,
  };
};
