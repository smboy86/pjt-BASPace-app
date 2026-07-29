import { ERemodelBudgetCode, ERemodelRequestStatus } from '@/entities/remodel-request';
import { getSupabaseClient, type Database } from '@/shared/supabase';
import type { IAdminRemodelRequestListItem } from '../types';

type TRemodelRequestRow = Pick<
  Database['public']['Tables']['remodel_requests']['Row'],
  | 'id'
  | 'customer_id'
  | 'status'
  | 'adjustment_confirmed_at'
  | 'region'
  | 'address_detail'
  | 'budget_range'
  | 'desired_schedule'
  | 'submitted_at'
  | 'created_at'
>;

const mapStatus = (status: TRemodelRequestRow['status']): ERemodelRequestStatus => {
  switch (status) {
    case 'draft':
      return ERemodelRequestStatus.DRAFT;
    case 'submitted':
      return ERemodelRequestStatus.SUBMITTED;
    case 'quote_adjustment':
      return ERemodelRequestStatus.QUOTE_ADJUSTMENT;
    case 'matched':
      return ERemodelRequestStatus.MATCHED;
    case 'in_consultation':
      return ERemodelRequestStatus.IN_CONSULTATION;
    case 'final_quote_sent':
      return ERemodelRequestStatus.FINAL_QUOTE_SENT;
    case 'confirmed':
      return ERemodelRequestStatus.CONFIRMED;
    case 'closed':
      return ERemodelRequestStatus.CLOSED;
    case 'cancelled':
      return ERemodelRequestStatus.CANCELLED;
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

export const fetchAdminRemodelRequests = async (): Promise<IAdminRemodelRequestListItem[]> => {
  const supabase = getSupabaseClient();
  const { data: requestRows, error: requestError } = await supabase
    .from('remodel_requests')
    .select(
      'id, customer_id, status, adjustment_confirmed_at, region, address_detail, budget_range, desired_schedule, submitted_at, created_at',
    )
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (requestError) throw requestError;
  if (requestRows.length === 0) return [];

  const requestIds = requestRows.map((request) => request.id);
  const customerIds = [...new Set(requestRows.map((request) => request.customer_id))];
  const [profilesResult, assignmentsResult] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', customerIds),
    supabase
      .from('request_assignments')
      .select('request_id, partner_id, status, assigned_at')
      .in('request_id', requestIds)
      .neq('status', 'declined')
      .order('assigned_at', { ascending: false }),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;

  const partnerIds = [
    ...new Set(assignmentsResult.data.map((assignment) => assignment.partner_id)),
  ];
  const partnersById = new Map<string, string>();

  if (partnerIds.length > 0) {
    const { data: partnerRows, error: partnerError } = await supabase
      .from('partners')
      .select('id, company_name')
      .in('id', partnerIds);

    if (partnerError) throw partnerError;
    partnerRows.forEach((partner) => partnersById.set(partner.id, partner.company_name));
  }

  const customerNamesById = new Map(
    profilesResult.data.map((profile) => [profile.id, profile.display_name]),
  );
  const partnerNamesByRequestId = new Map<string, string[]>();

  assignmentsResult.data.forEach((assignment) => {
    const partnerName = partnersById.get(assignment.partner_id);
    if (!partnerName) return;

    const names = partnerNamesByRequestId.get(assignment.request_id) ?? [];
    if (!names.includes(partnerName)) names.push(partnerName);
    partnerNamesByRequestId.set(assignment.request_id, names);
  });

  return requestRows.map((request) => ({
    id: request.id,
    customerId: request.customer_id,
    customerName: customerNamesById.get(request.customer_id) ?? '고객 정보 없음',
    status: mapStatus(request.status),
    adjustmentConfirmedAt: request.adjustment_confirmed_at ?? undefined,
    region: request.region,
    addressDetail: request.address_detail,
    budgetRange: mapBudgetRange(request.budget_range),
    desiredSchedule: request.desired_schedule,
    submittedAt: request.submitted_at ?? undefined,
    createdAt: request.created_at,
    assignedPartnerNames: partnerNamesByRequestId.get(request.id) ?? [],
  }));
};
