import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAdminRemodelRequests } from './admin-request-management.repository';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  requestNeq: vi.fn(),
}));

const remodelRequestTypes = vi.hoisted(() => ({
  ERemodelBudgetCode: {
    CONSULTATION: 'CONSULTATION',
    KRW_150_200: 'KRW_150_200',
    KRW_200_300: 'KRW_200_300',
    KRW_300_500: 'KRW_300_500',
  },
  ERemodelRequestStatus: {
    CLOSED: 'closed',
    CONFIRMED: 'confirmed',
    DRAFT: 'draft',
    FINAL_QUOTE_SENT: 'final_quote_sent',
    IN_CONSULTATION: 'in_consultation',
    MATCHED: 'matched',
    QUOTE_ADJUSTMENT: 'quote_adjustment',
    SUBMITTED: 'submitted',
  },
}));

vi.mock('@/entities/remodel-request', () => remodelRequestTypes);

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({
    from: mocks.from,
  }),
}));

const REQUEST_ROW = {
  address_detail: '101동 101호',
  adjustment_confirmed_at: null,
  budget_range: 'KRW_300_500',
  created_at: '2026-07-28T08:49:58.000Z',
  customer_id: 'customer-1',
  desired_schedule: '2개월 이내',
  id: 'request-1',
  region: '서울시 중구',
  status: 'final_quote_sent',
  submitted_at: '2026-07-28T08:49:58.000Z',
} as const;

const configureQueries = ({
  requests = [REQUEST_ROW],
}: {
  requests?: readonly (typeof REQUEST_ROW)[];
} = {}): void => {
  mocks.requestNeq.mockReturnValue({
    order: () => ({
      order: () => Promise.resolve({ data: requests, error: null }),
    }),
  });

  mocks.from.mockImplementation((table: string) => {
    if (table === 'remodel_requests') {
      return {
        select: () => ({
          neq: mocks.requestNeq,
        }),
      };
    }

    if (table === 'profiles') {
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: [{ display_name: '김고객', id: 'customer-1' }],
              error: null,
            }),
        }),
      };
    }

    if (table === 'request_assignments') {
      return {
        select: () => ({
          in: () => ({
            neq: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      assigned_at: '2026-07-28T09:00:00.000Z',
                      partner_id: 'partner-1',
                      request_id: 'request-1',
                      status: 'accepted',
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      };
    }

    if (table === 'partners') {
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: [{ company_name: '바른욕실', id: 'partner-1' }],
              error: null,
            }),
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });
};

describe('fetchAdminRemodelRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureQueries();
  });

  it('loads non-draft requests with their DB status, customer and assigned partner', async () => {
    await expect(fetchAdminRemodelRequests()).resolves.toEqual([
      expect.objectContaining({
        assignedPartnerNames: ['바른욕실'],
        budgetRange: remodelRequestTypes.ERemodelBudgetCode.KRW_300_500,
        customerName: '김고객',
        id: 'request-1',
        status: remodelRequestTypes.ERemodelRequestStatus.FINAL_QUOTE_SENT,
      }),
    ]);

    expect(mocks.requestNeq).toHaveBeenCalledWith('status', 'draft');
  });

  it('returns an empty list without querying related tables', async () => {
    configureQueries({ requests: [] });

    await expect(fetchAdminRemodelRequests()).resolves.toEqual([]);
    expect(mocks.from).toHaveBeenCalledOnce();
  });
});
