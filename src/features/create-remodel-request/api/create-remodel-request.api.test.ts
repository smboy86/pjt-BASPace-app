import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ERemodelBudgetCode } from '../../../entities/remodel-request/types';
import { submitRemodelRequest } from './create-remodel-request.api';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({ rpc: mocks.rpc }),
}));

vi.mock('@/entities/remodel-request', () => ({
  ERemodelRequestStatus: { SUBMITTED: 'submitted' },
  ERemodelScope: { FULL: 'full' },
  ESelectionDecision: { SELECTED: 'selected' },
}));

describe('submit remodel request api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: 'request-1', error: null });
  });

  it('sends the required construction type and exact desired date', async () => {
    const result = await submitRemodelRequest({
      addressDetail: '101동 101호',
      budgetCode: ERemodelBudgetCode.CONSULTATION,
      customerId: 'customer-1',
      desiredConstructionDate: '2026-08-20',
      notes: '',
      photos: [],
      region: '서울특별시 중구 세종대로 110',
      requiresDemolition: false,
      selections: [],
    });

    expect(mocks.rpc).toHaveBeenCalledWith('submit_customer_remodel_request', {
      target_address_detail: '101동 101호',
      target_budget_range: ERemodelBudgetCode.CONSULTATION,
      target_desired_construction_date: '2026-08-20',
      target_notes: '',
      target_region: '서울특별시 중구 세종대로 110',
      target_requires_demolition: false,
      target_selections: [],
    });
    expect(result).toMatchObject({
      desiredSchedule: '2026-08-20',
      requiresDemolition: false,
    });
  });
});
