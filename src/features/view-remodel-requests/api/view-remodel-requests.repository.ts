import {
  mapRemodelRequest,
  mapRemodelRequestScheduleChange,
  mapSelectionSnapshot,
  type IRemodelRequest,
  type IRemodelRequestScheduleChange,
  type ISelectionSnapshot,
} from '@/entities/remodel-request';
import { getSupabaseClient } from '@/shared/supabase';

export const fetchCustomerRemodelRequests = async (
  customerId: string,
): Promise<IRemodelRequest[]> => {
  if (!customerId) return [];

  const supabase = getSupabaseClient();
  const { data: requestRows, error: requestError } = await supabase
    .from('remodel_requests')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (requestError) throw requestError;
  if (requestRows.length === 0) return [];

  const requestIds = requestRows.map((request) => request.id);
  const [selectionsResult, scheduleChangesResult] = await Promise.all([
    supabase
      .from('selection_snapshots')
      .select('*')
      .in('request_id', requestIds)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('remodel_request_schedule_changes')
      .select('*')
      .in('request_id', requestIds)
      .order('changed_at', { ascending: false })
      .order('id', { ascending: false }),
  ]);

  if (selectionsResult.error) throw selectionsResult.error;
  if (scheduleChangesResult.error) throw scheduleChangesResult.error;

  const selectionsByRequestId = new Map<string, ISelectionSnapshot[]>();

  selectionsResult.data.forEach((selectionRow) => {
    const selections = selectionsByRequestId.get(selectionRow.request_id) ?? [];
    selections.push(mapSelectionSnapshot(selectionRow));
    selectionsByRequestId.set(selectionRow.request_id, selections);
  });

  const latestScheduleChangeByRequestId = new Map<string, IRemodelRequestScheduleChange>();
  const customerDesiredScheduleByRequestId = new Map<string, string>();
  scheduleChangesResult.data.forEach((scheduleChangeRow) => {
    if (!latestScheduleChangeByRequestId.has(scheduleChangeRow.request_id)) {
      latestScheduleChangeByRequestId.set(
        scheduleChangeRow.request_id,
        mapRemodelRequestScheduleChange(scheduleChangeRow),
      );
    }
    customerDesiredScheduleByRequestId.set(
      scheduleChangeRow.request_id,
      scheduleChangeRow.previous_schedule,
    );
  });

  return requestRows.map((requestRow) =>
    mapRemodelRequest(
      requestRow,
      selectionsByRequestId.get(requestRow.id) ?? [],
      latestScheduleChangeByRequestId.get(requestRow.id),
      customerDesiredScheduleByRequestId.get(requestRow.id) ?? requestRow.desired_schedule,
    ),
  );
};
