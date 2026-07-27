import {
  ERemodelRequestStatus,
  ERemodelScope,
  ESelectionDecision,
  type IRemodelRequest,
} from '@/entities/remodel-request';
import { getSupabaseClient, type TJson } from '@/shared/supabase';
import type { ISubmitRemodelRequestInput } from '../types';

const toSelectionPayload = (input: ISubmitRemodelRequestInput): TJson[] =>
  input.selections.map((selection) => ({
    optionId: selection.optionId,
    productId: selection.productId,
  }));

export const submitRemodelRequest = async (
  input: ISubmitRemodelRequestInput,
): Promise<IRemodelRequest> => {
  const { data: requestId, error } = await getSupabaseClient().rpc(
    'submit_customer_remodel_request',
    {
      target_address_detail: input.addressDetail,
      target_budget_range: input.budgetCode,
      target_notes: input.notes,
      target_region: input.region,
      target_selections: toSelectionPayload(input),
    },
  );

  if (error) throw error;

  const now = new Date().toISOString();

  return {
    id: requestId,
    customerId: input.customerId,
    status: ERemodelRequestStatus.SUBMITTED,
    region: input.region,
    addressDetail: input.addressDetail,
    housingType: '아파트',
    bathroomType: '공용 욕실',
    estimatedSize: '약 3㎡',
    hasBathtub: false,
    requiresDemolition: true,
    budgetRange: input.budgetCode,
    desiredSchedule: '2개월 이내',
    scope: ERemodelScope.FULL,
    priorities: [],
    notes: input.notes,
    photos: input.photos,
    selections: input.selections.map((selection) => ({
      id: `${requestId}-${selection.optionId}`,
      category: selection.optionName,
      itemName: selection.productName,
      selectedOptionIds: [selection.productId],
      selectedOptionNames: [selection.productName],
      basePriceSnapshot: selection.price,
      decisionStatus: ESelectionDecision.SELECTED,
    })),
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
};
