import { ERequestPartnerStatus } from '@/entities/partner';
import {
  ERemodelBudgetCode,
  mapRemodelRequest,
  mapRemodelRequestStatus,
  mapSelectionSnapshot,
  type ISelectionSnapshot,
} from '@/entities/remodel-request';
import { getSupabaseClient, type Database, type TJson } from '@/shared/supabase';
import type {
  IPartnerRemodelRequestDetail,
  IPartnerRemodelRequestListItem,
  IRespondToPartnerRequestInput,
} from '../types';

type TSelectionSnapshotRow = Database['public']['Tables']['selection_snapshots']['Row'];
type TRemodelRequestRow = Database['public']['Tables']['remodel_requests']['Row'];
type TPartnerListRow =
  Database['public']['Functions']['list_partner_assigned_remodel_requests']['Returns'][number];
type TPartnerDetailRow =
  Database['public']['Functions']['get_partner_assigned_remodel_request']['Returns'][number];
type TAssignmentStatus = Database['public']['Enums']['assignment_status'];

const isJsonRecord = (value: TJson): value is { [key: string]: TJson | undefined } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNullableString = (value: TJson | undefined): value is string | null =>
  value === null || typeof value === 'string';

const isNullableNumber = (value: TJson | undefined): value is number | null =>
  value === null || typeof value === 'number';

const isSelectionDecision = (
  value: TJson | undefined,
): value is TSelectionSnapshotRow['decision_status'] =>
  value === 'not_selected' || value === 'consultation_required' || value === 'selected';

const parseSelectionRows = (value: TJson): TSelectionSnapshotRow[] => {
  if (!Array.isArray(value)) {
    throw new Error('Invalid selection rows returned by the partner request detail.');
  }

  return value.map((candidate) => {
    if (
      !isJsonRecord(candidate) ||
      !isNullableNumber(candidate.base_price_snapshot) ||
      !isNullableString(candidate.catalog_item_id) ||
      typeof candidate.category !== 'string' ||
      typeof candidate.created_at !== 'string' ||
      !isSelectionDecision(candidate.decision_status) ||
      typeof candidate.id !== 'string' ||
      !isNullableString(candidate.item_name) ||
      typeof candidate.request_id !== 'string' ||
      candidate.selected_options === undefined
    ) {
      throw new Error('Invalid selection row returned by the partner request detail.');
    }

    return {
      base_price_snapshot: candidate.base_price_snapshot,
      catalog_item_id: candidate.catalog_item_id,
      category: candidate.category,
      created_at: candidate.created_at,
      decision_status: candidate.decision_status,
      id: candidate.id,
      item_name: candidate.item_name,
      request_id: candidate.request_id,
      selected_options: candidate.selected_options,
    };
  });
};

const mapAssignmentStatus = (status: TAssignmentStatus): ERequestPartnerStatus => {
  switch (status) {
    case 'assigned':
      return ERequestPartnerStatus.ASSIGNED;
    case 'accepted':
      return ERequestPartnerStatus.ACCEPTED;
    case 'declined':
      return ERequestPartnerStatus.DECLINED;
  }
};

const mapBudgetRange = (budgetRange: string): ERemodelBudgetCode => {
  switch (budgetRange) {
    case ERemodelBudgetCode.KRW_150_200:
      return ERemodelBudgetCode.KRW_150_200;
    case ERemodelBudgetCode.KRW_200_300:
      return ERemodelBudgetCode.KRW_200_300;
    case ERemodelBudgetCode.KRW_300_500:
      return ERemodelBudgetCode.KRW_300_500;
    case ERemodelBudgetCode.CONSULTATION:
      return ERemodelBudgetCode.CONSULTATION;
    default:
      throw new Error(`Unsupported remodel request budget range: ${budgetRange}`);
  }
};

const mapListItem = (row: TPartnerListRow): IPartnerRemodelRequestListItem => ({
  id: row.request_id,
  assignmentId: row.assignment_id,
  assignmentStatus: mapAssignmentStatus(row.assignment_status),
  status: mapRemodelRequestStatus(row.request_status),
  customerName: row.customer_name,
  region: row.region,
  addressDetail: row.address_detail,
  budgetRange: mapBudgetRange(row.budget_range),
  desiredSchedule: row.desired_schedule,
  submittedAt: row.submitted_at ?? undefined,
  createdAt: row.created_at,
});

const mapDetail = (row: TPartnerDetailRow): IPartnerRemodelRequestDetail => {
  const selectionRows = parseSelectionRows(row.selection_rows);
  const selections: ISelectionSnapshot[] = selectionRows.map(mapSelectionSnapshot);
  const requestRow: TRemodelRequestRow = {
    address_detail: row.address_detail,
    adjusted_at: row.adjusted_at,
    adjusted_by: row.adjusted_by,
    adjusted_estimate_amount: row.adjusted_estimate_amount,
    adjusted_estimate_reason: row.adjusted_estimate_reason,
    adjustment_confirmed_at: row.adjustment_confirmed_at,
    bathroom_type: row.bathroom_type,
    budget_range: row.budget_range,
    created_at: row.created_at,
    customer_id: row.customer_id,
    demolition_cost_snapshot_manwon: row.demolition_cost_snapshot_manwon,
    desired_schedule: row.desired_schedule,
    estimated_size: row.estimated_size,
    has_bathtub: row.has_bathtub,
    housing_type: row.housing_type,
    id: row.id,
    notes: row.notes,
    priorities: row.priorities,
    region: row.region,
    requires_demolition: row.requires_demolition,
    scope: row.scope,
    special_structure_note: row.special_structure_note,
    status: row.request_status,
    submitted_at: row.submitted_at,
    updated_at: row.updated_at,
  };

  return {
    request: mapRemodelRequest(requestRow, selections),
    customerName: row.customer_name,
    assignmentId: row.assignment_id,
    assignmentStatus: mapAssignmentStatus(row.assignment_status),
  };
};

export const fetchPartnerRemodelRequests = async (): Promise<IPartnerRemodelRequestListItem[]> => {
  const { data, error } = await getSupabaseClient().rpc('list_partner_assigned_remodel_requests');

  if (error) throw error;
  return data.map(mapListItem);
};

export const fetchPartnerRemodelRequestDetail = async (
  requestId: string,
): Promise<IPartnerRemodelRequestDetail> => {
  const { data, error } = await getSupabaseClient().rpc('get_partner_assigned_remodel_request', {
    target_request_id: requestId,
  });

  if (error) throw error;

  const row = data[0];
  if (!row) {
    throw new Error('Accessible partner remodel request was not found.');
  }

  return mapDetail(row);
};

export const respondToPartnerRequest = async ({
  requestId,
  action,
}: IRespondToPartnerRequestInput): Promise<ERequestPartnerStatus> => {
  const { data, error } = await getSupabaseClient().rpc('respond_to_partner_request', {
    target_request_id: requestId,
    target_action: action,
  });

  if (error) throw error;
  return mapAssignmentStatus(data);
};
