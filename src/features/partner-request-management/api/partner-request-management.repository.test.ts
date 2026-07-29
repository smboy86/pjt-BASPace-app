import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPartnerRemodelRequestDetail,
  fetchPartnerRemodelRequests,
  respondToPartnerRequest,
} from './partner-request-management.repository';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

const partnerTypes = vi.hoisted(() => ({
  ERequestPartnerStatus: {
    ACCEPTED: 'accepted',
    ASSIGNED: 'assigned',
    DECLINED: 'declined',
  },
}));

const remodelRequestTypes = vi.hoisted(() => ({
  ERemodelBudgetCode: {
    CONSULTATION: 'CONSULTATION',
    KRW_150_200: 'KRW_150_200',
    KRW_200_300: 'KRW_200_300',
    KRW_300_500: 'KRW_300_500',
  },
  ERemodelRequestStatus: {
    CANCELLED: 'cancelled',
  },
  mapRemodelRequest: (
    row: { id: string; status: string },
    selections: readonly { itemName?: string; selectedOptionIds: string[] }[],
  ) => ({
    id: row.id,
    status: row.status,
    selections,
  }),
  mapRemodelRequestStatus: (status: string) => status,
  mapSelectionSnapshot: (row: {
    item_name: string | null;
    selected_options: readonly { productId?: string }[];
  }) => ({
    itemName: row.item_name ?? undefined,
    selectedOptionIds: row.selected_options.flatMap((option) =>
      option.productId ? [option.productId] : [],
    ),
  }),
}));

vi.mock('@/entities/partner', () => partnerTypes);
vi.mock('@/entities/remodel-request', () => remodelRequestTypes);

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({
    rpc: mocks.rpc,
  }),
}));

const LIST_ROW = {
  address_detail: '101동 101호',
  assignment_id: 'assignment-1',
  assignment_status: 'declined',
  budget_range: 'KRW_300_500',
  created_at: '2026-07-29T10:00:00.000Z',
  customer_name: '김고객',
  desired_schedule: '2개월 이내',
  region: '서울시 중구',
  request_id: 'request-1',
  request_status: 'cancelled',
  submitted_at: '2026-07-29T10:00:00.000Z',
} as const;

const DETAIL_ROW = {
  ...LIST_ROW,
  adjusted_at: null,
  adjusted_by: null,
  adjusted_estimate_amount: null,
  adjustment_confirmed_at: null,
  bathroom_type: '공용 욕실',
  customer_id: 'customer-1',
  estimated_size: null,
  has_bathtub: false,
  housing_type: '아파트',
  id: 'request-1',
  notes: '',
  priorities: [],
  requires_demolition: true,
  scope: 'full',
  selection_rows: [
    {
      base_price_snapshot: 2_000_000,
      catalog_item_id: null,
      category: '타일',
      created_at: '2026-07-29T10:00:00.000Z',
      decision_status: 'selected',
      id: 'selection-1',
      item_name: '베이지 타일',
      request_id: 'request-1',
      selected_options: [
        {
          productId: 'product-1',
          productName: '베이지 타일',
        },
      ],
    },
  ],
  special_structure_note: null,
  updated_at: '2026-07-29T11:00:00.000Z',
} as const;

describe('partner request management repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps a declined assignment in the cancelled request list', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [LIST_ROW], error: null });

    await expect(fetchPartnerRemodelRequests()).resolves.toEqual([
      expect.objectContaining({
        assignmentStatus: partnerTypes.ERequestPartnerStatus.DECLINED,
        id: 'request-1',
        status: remodelRequestTypes.ERemodelRequestStatus.CANCELLED,
      }),
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith('list_partner_assigned_remodel_requests', {});
  });

  it('maps the secure detail RPC response into the remodel-request domain', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [DETAIL_ROW], error: null });

    await expect(fetchPartnerRemodelRequestDetail('request-1')).resolves.toEqual(
      expect.objectContaining({
        assignmentId: 'assignment-1',
        assignmentStatus: partnerTypes.ERequestPartnerStatus.DECLINED,
        customerName: '김고객',
        request: expect.objectContaining({
          id: 'request-1',
          status: remodelRequestTypes.ERemodelRequestStatus.CANCELLED,
          selections: [
            expect.objectContaining({
              itemName: '베이지 타일',
              selectedOptionIds: ['product-1'],
            }),
          ],
        }),
      }),
    );
  });

  it('passes only the request id and action to the response RPC', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: 'declined', error: null });

    await expect(
      respondToPartnerRequest({ requestId: 'request-1', action: 'decline' }),
    ).resolves.toBe(partnerTypes.ERequestPartnerStatus.DECLINED);
    expect(mocks.rpc).toHaveBeenCalledWith('respond_to_partner_request', {
      target_action: 'decline',
      target_request_id: 'request-1',
    });
  });
});
