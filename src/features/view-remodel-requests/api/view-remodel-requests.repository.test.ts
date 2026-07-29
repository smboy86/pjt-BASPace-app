import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCustomerRemodelRequests } from './view-remodel-requests.repository';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

const remodelRequestTypes = vi.hoisted(() => {
  const ERemodelBudgetCode = {
    CONSULTATION: 'CONSULTATION',
    KRW_150_200: 'KRW_150_200',
    KRW_200_300: 'KRW_200_300',
    KRW_300_500: 'KRW_300_500',
  };
  const ERemodelRequestStatus = {
    CANCELLED: 'cancelled',
    CLOSED: 'closed',
    CONFIRMED: 'confirmed',
    DRAFT: 'draft',
    FINAL_QUOTE_SENT: 'final_quote_sent',
    IN_CONSULTATION: 'in_consultation',
    MATCHED: 'matched',
    QUOTE_ADJUSTMENT: 'quote_adjustment',
    SUBMITTED: 'submitted',
  };

  return {
    ERemodelBudgetCode,
    ERemodelRequestStatus,
    ERemodelScope: {
      FULL: 'full',
      PARTIAL: 'partial',
    },
    ESelectionDecision: {
      CONSULTATION_REQUIRED: 'consultation_required',
      NOT_SELECTED: 'not_selected',
      SELECTED: 'selected',
    },
    mapSelectionSnapshot: (row: {
      base_price_snapshot: number | null;
      catalog_item_id: string | null;
      category: string;
      decision_status: string;
      id: string;
      item_name: string | null;
      selected_options: readonly {
        productId: string;
        productName: string;
      }[];
    }) => ({
      basePriceSnapshot: row.base_price_snapshot ?? undefined,
      catalogItemId: row.catalog_item_id ?? undefined,
      category: row.category,
      decisionStatus: row.decision_status,
      id: row.id,
      itemName: row.item_name ?? undefined,
      selectedOptionIds: row.selected_options.map((option) => option.productId),
      selectedOptionNames: row.selected_options.map((option) => option.productName),
    }),
    mapRemodelRequest: (
      row: {
        budget_range: string;
        customer_id: string;
        id: string;
        status: string;
      },
      selections: unknown[],
    ) => ({
      budgetRange: row.budget_range,
      customerId: row.customer_id,
      id: row.id,
      photos: [],
      selections,
      status: row.status,
    }),
  };
});

vi.mock('@/entities/remodel-request', () => remodelRequestTypes);

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({
    from: mocks.from,
  }),
}));

const REQUEST_ROW = {
  address_detail: '101동 101호',
  bathroom_type: '공용 욕실',
  budget_range: 'KRW_300_500',
  created_at: '2026-07-28T08:49:58.000Z',
  customer_id: 'customer-1',
  desired_schedule: '2개월 이내',
  estimated_size: '약 3㎡',
  has_bathtub: false,
  housing_type: '아파트',
  id: 'request-1',
  notes: '환기 개선이 필요해요.',
  priorities: [],
  region: '서울시 중구',
  requires_demolition: true,
  scope: 'full',
  special_structure_note: null,
  status: 'submitted',
  submitted_at: '2026-07-28T08:49:58.000Z',
  updated_at: '2026-07-28T08:49:58.000Z',
} as const;

const SELECTION_ROW = {
  base_price_snapshot: 1_001_111,
  catalog_item_id: null,
  category: '세면대/양변기',
  created_at: '2026-07-28T08:49:58.000Z',
  decision_status: 'selected',
  id: 'selection-1',
  item_name: '기존 제품 1',
  request_id: REQUEST_ROW.id,
  selected_options: [
    {
      optionId: 'option-1',
      productId: 'product-1',
      productName: '기존 제품 1',
    },
  ],
} as const;

const configureQueries = ({
  requests = [REQUEST_ROW],
  selections = [SELECTION_ROW],
}: {
  requests?: readonly (typeof REQUEST_ROW)[];
  selections?: readonly (typeof SELECTION_ROW)[];
} = {}): void => {
  mocks.from.mockImplementation((table: string) => {
    if (table === 'remodel_requests') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: requests, error: null }),
            }),
          }),
        }),
      };
    }

    if (table === 'selection_snapshots') {
      return {
        select: () => ({
          in: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: selections, error: null }),
            }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });
};

describe('fetchCustomerRemodelRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureQueries();
  });

  it('loads persisted customer requests with their selection snapshots', async () => {
    await expect(fetchCustomerRemodelRequests('customer-1')).resolves.toEqual([
      expect.objectContaining({
        budgetRange: remodelRequestTypes.ERemodelBudgetCode.KRW_300_500,
        customerId: 'customer-1',
        id: 'request-1',
        photos: [],
        status: remodelRequestTypes.ERemodelRequestStatus.SUBMITTED,
        selections: [
          expect.objectContaining({
            id: 'selection-1',
            selectedOptionIds: ['product-1'],
            selectedOptionNames: ['기존 제품 1'],
          }),
        ],
      }),
    ]);

    expect(mocks.from).toHaveBeenNthCalledWith(1, 'remodel_requests');
    expect(mocks.from).toHaveBeenNthCalledWith(2, 'selection_snapshots');
  });

  it('returns an empty list without querying snapshots when the customer has no requests', async () => {
    configureQueries({ requests: [] });

    await expect(fetchCustomerRemodelRequests('customer-1')).resolves.toEqual([]);
    expect(mocks.from).toHaveBeenCalledOnce();
  });
});
