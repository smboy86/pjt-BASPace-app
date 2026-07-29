import {
  mapRemodelRequest,
  mapSelectionSnapshot,
  type IRemodelRequest,
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
  const { data: selectionRows, error: selectionError } = await supabase
    .from('selection_snapshots')
    .select('*')
    .in('request_id', requestIds)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (selectionError) throw selectionError;

  const selectionsByRequestId = new Map<string, ISelectionSnapshot[]>();

  selectionRows.forEach((selectionRow) => {
    const selections = selectionsByRequestId.get(selectionRow.request_id) ?? [];
    selections.push(mapSelectionSnapshot(selectionRow));
    selectionsByRequestId.set(selectionRow.request_id, selections);
  });

  return requestRows.map((requestRow) =>
    mapRemodelRequest(requestRow, selectionsByRequestId.get(requestRow.id) ?? []),
  );
};
