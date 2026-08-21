import {
  mapRemodelRequest,
  mapRemodelRequestScheduleChange,
  mapSelectionSnapshot,
  resolveRequestPhotos,
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

  const [selectionsResult, customerResult, scheduleChangesResult, photosResult] = await Promise.all([
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
      .order('changed_at', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('request_photos')
      .select('*')
      .eq('request_id', requestId)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
  ]);

  if (selectionsResult.error) throw selectionsResult.error;
  if (customerResult.error) throw customerResult.error;
  if (scheduleChangesResult.error) throw scheduleChangesResult.error;
  if (photosResult.error) throw photosResult.error;

  const selections: ISelectionSnapshot[] = selectionsResult.data.map(mapSelectionSnapshot);
  const photos = await resolveRequestPhotos(photosResult.data);
  const firstScheduleChangeRow = scheduleChangesResult.data[0];
  const latestScheduleChangeRow = scheduleChangesResult.data.at(-1);

  return {
    request: mapRemodelRequest(
      requestRow,
      selections,
      latestScheduleChangeRow
        ? mapRemodelRequestScheduleChange(latestScheduleChangeRow)
        : undefined,
      firstScheduleChangeRow?.previous_schedule ?? requestRow.desired_schedule,
      photos,
    ),
    customerName: customerResult.data.display_name,
  };
};
